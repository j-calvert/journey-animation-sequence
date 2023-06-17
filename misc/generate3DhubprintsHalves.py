import FreeCAD as App
import Part
import Draft
from BOPTools import SplitFeatures, SplitAPI
from CompoundTools import Explode
import math
from itertools import combinations
from functools import partial
import numpy as np

# run in freecad by copy and paste the entire contents of this file into the python console

# Start code taken from https://github.com/antiprism/antiprism_python
# that I barely understand.
# Since we read this file in the FreeCAD Python console, and then "exec" it
# from within that runtime we need to
# include all our dependencies that (probably) aren't available in that runtime
"""
Create coordinates for a higher frequency, plane-faced or spherical,
icosahedron, octahedron or tetrahedron. For Class I and II patterns
freq (default 1) is the number of divisions along an edge, for Class III
patterns (and those specified by two numbers) freq is the number of times
the pattern is repeated along an edge. By default the edges are divided
into sections with an equal angle at the origin, a Class I pattern, and
the points are then projected onto a sphere.
"""


def safe_for_trig(val):
    if abs(val) > 1:
        return -1 if val < 0 else 1
    else:
        return val


class Vec:
    def __init__(self, *v):
        self.v = list(v)

    def fromlist(self, v):
        if not isinstance(v, list):
            raise TypeError
        self.v = v[:]
        return self

    def copy(self):
        return Vec().fromlist(self.v)

    def __str__(self):
        return "(" + repr(self.v)[1:-1] + ")"

    def __repr__(self):
        return "Vec(" + repr(self.v)[1:-1] + ")"

    def __len__(self):
        return len(self.v)

    def __getitem__(self, key):
        if not isinstance(key, int):
            raise TypeError
        if key < 0 or key >= len(self.v):
            raise KeyError
        return self.v[key]

    def __setitem__(self, key, value):
        if not isinstance(key, int):
            raise TypeError
        if key < 0 or key >= len(self.v):
            raise KeyError
        self.v[key] = value

    # Element-wise negation
    def __neg__(self):
        v = list(map(lambda x: -x, self.v))
        return Vec().fromlist(v)

    # Element-wise addition
    def __add__(self, other):
        v = list(map(lambda x, y: x + y, self.v, other.v))
        return Vec().fromlist(v)

    # Element-wise subtraction
    def __sub__(self, other):
        v = list(map(lambda x, y: x - y, self.v, other.v))
        return Vec().fromlist(v)

    # Element-wise multiplication by scalar
    def __mul__(self, scalar):
        v = list(map(lambda x: x * scalar, self.v))
        return Vec().fromlist(v)

    # Element-wise pre-multiplication by scalar
    def __rmul__(self, scalar):
        return self.__mul__(scalar)

    # Element-wise division by scalar
    def __truediv__(self, scalar):
        return self.__mul__(1 / scalar)

    # Vector magnitude/length squared
    def mag2(self):
        return self.dot(self, self)

    # Vector magnitude/length
    def mag(self):
        return math.sqrt(self.mag2())

    # Vector as unit
    def unit(self):
        return self.__truediv__(self.mag())

    # Vector rotated about z-axis
    def rot_z(self, ang):
        r = math.sqrt(self.v[0] ** 2 + self.v[1] ** 2)
        initial_ang = math.atan2(self.v[1], self.v[0])
        final_ang = initial_ang + ang
        return Vec(r * math.cos(final_ang), r * math.sin(final_ang), self.v[2])

    # Cross product v0 x v1
    @staticmethod
    def cross(v0, v1):
        return Vec(
            v1[2] * v0[1] - v1[1] * v0[2],
            v1[0] * v0[2] - v1[2] * v0[0],
            v1[1] * v0[0] - v1[0] * v0[1],
        )

    # Dot product v0 . v1
    @staticmethod
    def dot(v0, v1):
        return sum(map(lambda x, y: x * y, v0.v, v1.v))

    # Triple product v0. (v1 x v2)
    @staticmethod
    def triple(v0, v1, v2):
        return Vec.dot(v0, Vec.cross(v1, v2))


def get_octahedron(verts, faces):
    """Return an octahedron"""
    X = 0.25 * math.sqrt(2)
    verts.extend(
        [
            Vec(0.0, 0.5, 0.0),
            Vec(X, 0.0, -X),
            Vec(X, 0.0, X),
            Vec(-X, 0.0, X),
            Vec(-X, 0.0, -X),
            Vec(0.0, -0.5, 0.0),
        ]
    )

    faces.extend(
        [
            (0, 1, 2),
            (0, 2, 3),
            (0, 3, 4),
            (0, 4, 1),
            (5, 2, 1),
            (2, 5, 3),
            (3, 5, 4),
            (4, 5, 1),
        ]
    )


def get_tetrahedron(verts, faces):
    """Return an tetrahedron"""
    X = 1 / math.sqrt(3)
    verts.extend([Vec(-X, X, -X), Vec(-X, -X, X), Vec(X, X, X), Vec(X, -X, -X)])
    faces.extend([(0, 1, 2), (0, 3, 1), (0, 2, 3), (2, 1, 3)])


def get_ico_coords():
    """Return icosahedron coordinate values"""
    phi = (math.sqrt(5) + 1) / 2
    rad = math.sqrt(phi + 2)
    return 1 / rad, phi / rad


def get_triangle(verts, faces):
    """Return an triangle"""
    if 1:
        Y = math.sqrt(3.0) / 12.0
        Z = -0.8
        verts.extend([Vec(-0.25, -Y, Z), Vec(0.25, -Y, Z), Vec(0.0, 2 * Y, Z)])
        faces.extend([(0, 1, 2)])
    else:
        X, Z = get_ico_coords()
        verts.extend(
            [Vec(-X, 0.0, -Z), Vec(X, 0.0, -Z), Vec(0.0, Z, -X), Vec(0.0, -Z, -X)]
        )
        faces.extend([(0, 1, 2), (0, 3, 1)])


def get_icosahedron(verts, faces):
    """Return an icosahedron"""
    X, Z = get_ico_coords()
    verts.extend(
        [
            Vec(-X, 0.0, Z),
            Vec(X, 0.0, Z),
            Vec(-X, 0.0, -Z),
            Vec(X, 0.0, -Z),
            Vec(0.0, Z, X),
            Vec(0.0, Z, -X),
            Vec(0.0, -Z, X),
            Vec(0.0, -Z, -X),
            Vec(Z, X, 0.0),
            Vec(-Z, X, 0.0),
            Vec(Z, -X, 0.0),
            Vec(-Z, -X, 0.0),
        ]
    )

    faces.extend(
        [
            (0, 4, 1),
            (0, 9, 4),
            (9, 5, 4),
            (4, 5, 8),
            (4, 8, 1),
            (8, 10, 1),
            (8, 3, 10),
            (5, 3, 8),
            (5, 2, 3),
            (2, 7, 3),
            (7, 10, 3),
            (7, 6, 10),
            (7, 11, 6),
            (11, 0, 6),
            (0, 1, 6),
            (6, 1, 10),
            (9, 0, 11),
            (9, 11, 2),
            (9, 2, 5),
            (7, 2, 11),
        ]
    )


def get_poly(poly, verts, edges, faces):
    """Return the base polyhedron"""
    if poly == "i":
        get_icosahedron(verts, faces)
    elif poly == "o":
        get_octahedron(verts, faces)
    elif poly == "t":
        get_tetrahedron(verts, faces)
    elif poly == "T":
        get_triangle(verts, faces)
    else:
        return 0

    for face in faces:
        for i in range(0, len(face)):
            i2 = i + 1
            if i2 == len(face):
                i2 = 0

            if face[i] < face[i2]:
                edges[(face[i], face[i2])] = 0
            else:
                edges[(face[i2], face[i])] = 0

    return 1


def grid_to_points(grid, freq, div_by_len, f_verts, face):
    """Convert grid coordinates to Cartesian coordinates"""
    points = []
    v = []
    for vtx in range(3):
        v.append([Vec(0.0, 0.0, 0.0)])
        edge_vec = f_verts[(vtx + 1) % 3] - f_verts[vtx]
        if div_by_len:
            for i in range(1, freq + 1):
                v[vtx].append(edge_vec * float(i) / freq)
        else:
            ang = 2 * math.asin(edge_vec.mag() / 2.0)
            unit_edge_vec = edge_vec.unit()
            for i in range(1, freq + 1):
                len = math.sin(i * ang / freq) / math.sin(
                    math.pi / 2 + ang / 2 - i * ang / freq
                )
                v[vtx].append(unit_edge_vec * len)

    for i, j in grid.values():
        if (i == 0) + (j == 0) + (i + j == freq) == 2:  # skip vertex
            continue
        # skip edges in one direction
        if (
            (i == 0 and face[2] > face[0])
            or (j == 0 and face[0] > face[1])
            or (i + j == freq and face[1] > face[2])
        ):
            continue

        n = [i, j, freq - i - j]
        v_delta = (
            v[0][n[0]] + v[(0 - 1) % 3][freq - n[(0 + 1) % 3]] - v[(0 - 1) % 3][freq]
        )
        pt = f_verts[0] + v_delta
        if not div_by_len:
            for k in [1, 2]:
                v_delta = (
                    v[k][n[k]]
                    + v[(k - 1) % 3][freq - n[(k + 1) % 3]]
                    - v[(k - 1) % 3][freq]
                )
                pt = pt + f_verts[k] + v_delta
            pt = pt / 3
        points.append(pt)

    return points


def make_grid(freq, m, n):
    """Make the geodesic pattern grid"""
    grid = {}
    rng = (2 * freq) // (m + n)
    for i in range(rng):
        for j in range(rng):
            x = i * (-n) + j * (m + n)
            y = i * (m + n) + j * (-m)

            if x >= 0 and y >= 0 and x + y <= freq:
                grid[(i, j)] = (x, y)

    return grid


def class_type(val_str):
    """Read the class pattern specifier"""
    order = ["first", "second"]
    num_parts = val_str.count(",") + 1
    vals = val_str.split(",", 2)
    if num_parts == 1:
        if vals[0] == "1":
            pat = [1, 0, 1]
        elif vals[0] == "2":
            pat = [1, 1, 1]
        else:
            raise Exception(
                "class type can only be 1 or 2 when a single value is given"
            )

    elif num_parts == 2:
        pat = []
        for i, num_str in enumerate(vals):
            try:
                num = int(num_str)
            except:
                raise Exception(order[i] + " class pattern value not an integer")
            if num < 0:
                raise Exception(order[i] + " class pattern cannot be negative")
            if num == 0 and i == 1 and pat[0] == 0:
                raise Exception(" class pattern values cannot both be 0")
            pat.append(num)

        rep = math.gcd(*pat)
        pat = [pat_num // rep for pat_num in pat]
        pat.append(rep)

    else:
        raise Exception("class type contains more than two values")

    return pat


# notes:
#   Depends on anti_lib.py. Use Antiprism conv_hull to create faces for
#   convex models (larger frequency tetrahdral geodesic spheres tend to
#   be non-convex).

# examples:
#   Icosahedral Class I F10 geodesic sphere
#   geodesic.py 10 | conv_hull | antiview

#   Octahedral Class 2 geodesic sphere
#   geodesic.py -p o -c 2 10 | conv_hull | antiview

#   Icosahedral Class 3 [3,1] geodesic sphere
#   geodesic.py -c 3,1 | conv_hull | antiview

#   Flat-faced equal-length division tetrahedral model
#   geodesic.py -p t -f -l -c 5,2 | conv_hull -a | antiview -v 0.05

# parser.add_argument(
#     'repeats',
#     help='number of times the pattern is repeated (default: 1)',
#     type=anti_lib.read_positive_int,
#     nargs='?',
#     default=1)
# parser.add_argument(
#     '-p', '--polyhedron',
#     help='base polyhedron: i - icosahedron (default), '
#          'o - octahedron, t - tetrahedron, T - triangle.',
#     choices=['i', 'o', 't', 'T,
#     default='i')
# parser.add_argument(
#     '-c', '--class-pattern',
#     help='class of face division,  1 (Class I, default) or '
#          '2 (Class II), or two numbers separated by a comma to '
#          'determine the pattern (Class III generally, but 1,0 is '
#          'Class I, 1,1 is Class II, etc).',
#     type=class_type,
#     default=[1, 0, 1])
# parser.add_argument(
#     '-f', '--flat-faced',
#     help='keep flat-faced polyhedron rather than projecting '
#          'the points onto a sphere.',
#     action='store_true')
# parser.add_argument(
#     '-l', '--equal-length',
#     help='divide the edges by equal lengths rather than equal angles',
#     action='store_true')


def getPolyPoints(
    class_pattern=[1, 0, 0],
    repeats=1,
    polyhedron="i",
    flat_faced=False,
    equal_length=False,
):
    verts = []
    edges = {}
    faces = []
    get_poly(polyhedron, verts, edges, faces)

    (M, N, reps) = class_pattern
    repeats = repeats * reps
    freq = repeats * (M**2 + M * N + N**2)

    grid = {}
    grid = make_grid(freq, M, N)

    points = verts
    for face in faces:
        if polyhedron == "T":
            face_edges = (0, 0, 0)  # generate points for all edges
        else:
            face_edges = face
        points[len(points) : len(points)] = grid_to_points(
            grid, freq, equal_length, [verts[face[i]] for i in range(3)], face_edges
        )

    if not flat_faced:
        points = [p.unit() for p in points]  # Project onto sphere

    return points


##  End code taken from https://github.com/antiprism/antiprism_python

## Start code written with lots of help from GPT-4 :D


def get_sphere(doc, radius):
    sphere = doc.addObject("Part::Sphere", "Sphere")
    sphere.Radius = radius
    return sphere


def create_slicing_plane(doc, radius):
    rp = radius + 1
    plane = doc.addObject("Part::Plane", "SlicingPlane")
    plane.Width = 2 * rp  # Make the plane larger than the object
    plane.Length = 2 * rp

    # Adjust the plane's position so that its center is at the origin
    pos = App.Vector(-rp, -rp, 0)

    # Set up the rotation
    rotation_axis = App.Vector(0, 1, 0)  # Y-axis
    rotation_angle = 0  # This works even if non-zero (took a while...)
    rot = App.Rotation(rotation_axis, rotation_angle)
    plane.Placement = App.Placement(pos, rot, App.Vector(rp, rp, 0))
    return plane


# create_slicing_plane(doc, 100)


def get_cylinder(doc, radius, height):
    cylinder = doc.addObject("Part::Cylinder", f"Cylinder")
    cylinder.Radius = radius
    cylinder.Height = height
    return cylinder


def get_cone(doc, radius2, radius1, height):
    cylinder = doc.addObject("Part::Cone", f"Coneish")
    cylinder.Radius1 = radius1
    cylinder.Radius2 = radius2
    cylinder.Height = height
    return cylinder


def clone_object_to_another_doc(source_file, target_doc):
    current_objects = set(target_doc.Objects)

    # Import the temporary STEP file into the target document
    # print(f"Importing from {source_file} to {target_doc.Name}")
    Part.insert(source_file, target_doc.Name)
    target_doc.recompute()

    # Find the newly imported object by comparing the object sets
    new_objects = set(target_doc.Objects) - current_objects
    # print(f"Fount {len(new_objects)} new objects")
    if len(new_objects) != 1:
        raise RuntimeError("Failed to find the imported object in the target document")

    imported_obj = new_objects.pop()
    return imported_obj


def put_object_along_edge(doc, object, edge, rad, offset):
    # Calculate the rotation axis and angle to align the cylinder with the edge

    v1 = App.Vector(edge[0][0], edge[0][1], edge[0][2])
    v2 = App.Vector(edge[1][0], edge[1][1], edge[1][2])
    edge = v2 - v1

    unit_z = App.Vector(0, 0, 1)
    rotation_axis = unit_z.cross(edge)
    rotation_angle = math.degrees(App.Vector(0, 0, 1).getAngle(edge))

    # Check if the edge is parallel to Z axis
    unit_edge = edge.normalize()
    if unit_edge == unit_z or unit_edge == -unit_z:
        rotation_axis = App.Vector(1, 0, 0)  # Or use Y axis: App.Vector(0, 1, 0)
        if edge.z < 0:  # If the edge is in opposite direction, rotate 180 degrees
            rotation_angle = 180

    # Create the placement with position at the origin and the calculated rotation
    new_rotation = App.Rotation(rotation_axis, rotation_angle)
    placement = App.Placement(
        App.Vector(0, 0, 0), new_rotation.multiply(object.Placement.Rotation)
    )
    placement.move(v1.normalize() * rad + edge.normalize() * offset)
    # Set the cylinder's placement
    object.Placement = placement
    doc.recompute()
    return object


def put_object_on_vertex(doc, object, vertex, rad):
    # Calculate the rotation axis and angle to align the cylinder with the vertex
    rotation_axis = App.Vector(0, 0, 1).cross(vertex)
    rotation_angle = math.degrees(App.Vector(0, 0, 1).getAngle(vertex))
    # Create the placement with position at the origin and the calculated rotation
    new_rotation = App.Rotation(rotation_axis, rotation_angle)
    placement = App.Placement(
        App.Vector(0, 0, 0), new_rotation.multiply(object.Placement.Rotation)
    )
    placement.move(vertex.normalize() * rad)
    # Set the cylinder's placement
    object.Placement = placement
    doc.recompute()
    return object


# cust_shape_step = "/Users/jcalvert/NangCand6.step"
def place_nang(doc, vertex, rad, cust_shape_step_doc):
    nang = clone_object_to_another_doc(cust_shape_step_doc, doc)
    rotation_center = App.Vector(
        0, 0, 0
    )  # Adjust this if you want to rotate around a different point
    rotation_axis = App.Vector(0, 1, 0)  # Y-axis
    rotation_angle = -90  # 90 degrees
    rot = App.Rotation(rotation_axis, rotation_angle)
    nang.Placement.Rotation = rot.multiply(nang.Placement.Rotation)
    doc.recompute()
    return put_object_on_vertex(doc, nang, vertex, rad)


# toothpick_diameter / 2
def place_radial_cylinder(doc, vertex, dist, cylinder_rad, height):
    return put_object_on_vertex(
        doc,
        get_cone(doc, cylinder_rad, cylinder_rad * dist / (dist + height), height),
        vertex,
        dist,
    )


def get_polygon_pyramid(doc, cylinder_rad, height, dist, sides):
    Gui.runCommand("Pyramid", 0)
    polygon_pyramid = doc.Objects[-1]
    polygon_pyramid.Radius2 = cylinder_rad
    polygon_pyramid.Radius1 = cylinder_rad * (height + dist) / dist
    polygon_pyramid.Height = height
    polygon_pyramid.Sidescount = sides
    polygon_pyramid.Z_rotation = 360 / sides / 2
    return polygon_pyramid


def place_radial_polygon_pyramid(doc, vertex, dist, cylinder_rad, height, sides):
    return put_object_on_vertex(
        doc, get_polygon_pyramid(doc, cylinder_rad, height, dist, sides), vertex, dist
    )


def place_nang_shell(
    doc,
    vertex,
    rad,
    cust_shape_step_doc,
    cylinder_rad,
    outer_cut_depth,
    inner_cut_depth,
):
    cylinder_height = outer_cut_depth + inner_cut_depth
    cylinder_dist = rad - inner_cut_depth

    shell = place_radial_cylinder(
        doc,
        vertex,
        dist=cylinder_dist,
        cylinder_rad=cylinder_rad,
        height=cylinder_height,
    )
    # return shell
    cut_piece = place_nang(doc, vertex, rad - wiggle, cust_shape_step_doc)
    cut = doc.addObject("Part::Cut", "NangShell")
    cut.Base = shell
    cut.Tool = cut_piece
    return cut


def find_adjacent_edges(vertices):
    edges = []
    min_for_i = [float("inf")] * len(vertices)

    for i in range(len(vertices)):
        for j in range(len(vertices)):
            if i != j:
                dist = (vertices[i] - vertices[j]).Length
                if dist < min_for_i[i]:
                    min_for_i[i] = dist

    for i in range(len(vertices)):
        for j in range(i + 1, len(vertices)):
            distance = (vertices[i] - vertices[j]).Length
            if distance < min_for_i[i] * 1.5:
                edges.append((vertices[i], vertices[j]))

    return edges


def make_slab_edge(
    doc, edge, rad, cylinder_rad, edge_thickness, outer_cut_depth, inner_cut_depth
):
    ee1 = App.Vector(edge[0][0], edge[0][1], edge[0][2])
    ee2 = App.Vector(edge[1][0], edge[1][1], edge[1][2])
    v1_inner = ee1 * (rad - inner_cut_depth)
    v1_outer = ee1 * (rad + outer_cut_depth)
    v2_inner = ee2 * (rad - inner_cut_depth)
    v2_outer = ee2 * (rad + outer_cut_depth)
    edge = v2_outer - v1_outer
    inner_offset = cylinder_rad * (rad - inner_cut_depth - outer_cut_depth) / rad
    outer_offset = cylinder_rad
    edge_normalized = App.Vector(edge.x, edge.y, edge.z).normalize()
    edge_projected_1 = edge_normalized - edge_normalized.dot(ee1) * ee1
    edge_projected_2 = edge_normalized - edge_normalized.dot(ee2) * ee2
    p1 = v1_outer + edge_projected_1 * outer_offset
    p2 = v1_inner + edge_projected_1 * inner_offset
    p3 = v2_inner - edge_projected_2 * inner_offset
    p4 = v2_outer - edge_projected_2 * outer_offset

    # Compute normal to the face (cross product of two edges)
    edge1 = p2 - p1
    edge2 = p4 - p1
    normal = edge1.cross(edge2).normalize()
    # Create the trapezoid
    wire = Part.makePolygon(
        [p - normal * edge_thickness / 2 for p in [p1, p2, p3, p4, p1]]
    )
    face = Part.Face(wire)

    height = edge_thickness
    solid = face.extrude(normal * height)

    my_solid = doc.addObject("Part::Feature")
    my_solid.Shape = solid

    return my_solid


def placeEdges(
    doc,
    topshapes,
    bottomshapes,
    edges,
    edge_diam,
    rad,
    offset,
    outer_cut_depth,
    inner_cut_depth,
    is_topedge=lambda edge: edge[0].z > -0.0001 or edge[1].z > -0.0001,
):
    for edge in edges:
        length = (edge[1] - edge[0]).Length
        # cyl_edge = put_object_along_edge(
        #     doc,
        #     get_cylinder(doc, edge_diam / 2, length * rad - 2 * offset),
        #     edge,
        #     rad,
        #     offset,
        # )
        slab_edge = make_slab_edge(
            doc,
            edge,
            rad,
            cylinder_rad=offset,
            edge_thickness=edge_diam,
            outer_cut_depth=outer_cut_depth,
            inner_cut_depth=inner_cut_depth,
        )
        if is_topedge(edge):
            topshapes.append(slab_edge)
        else:
            bottomshapes.append(slab_edge)

    return topshapes, bottomshapes


def placeOnVertices(
    doc, points, place_cutshape, is_topshape=lambda vertex: vertex.z > -0.0001
):
    topshapes, bottomshapes = [], []
    for idx, vertex in enumerate(points):
        normalized_vertex = np.array(vertex) / vertex.mag()
        # print(normalized_vertex)

        # Convert the numpy array to a FreeCAD vector
        # fc_vertex = App.Vector(vertex[0], vertex[1], vertex[2])
        # fc_vertex = App.Vector(.577, .577, .577)
        fc_vertex = App.Vector(
            normalized_vertex[0], normalized_vertex[1], normalized_vertex[2]
        )
        if is_topshape(fc_vertex):
            topshapes.append(place_cutshape(doc, fc_vertex))
        else:
            bottomshapes.append(place_cutshape(doc, fc_vertex))

    return topshapes, bottomshapes


# consts
outer_cut_depth = 5  # For nang head seating
inner_cut_depth = 5  # For screw head seating
wiggle = 0.35  # avoid actual tangents/infintesimals
edge_diam = 2.5  # For edge thickness
shell_cylinder_rad = 12 / 2

toothpick_diameter = 2.25  # Used for polar hole.  Originally 2.15


### Start Main Method
def nang_ball_core(sphere_radius, class_pattern):
    points = getPolyPoints(class_pattern=class_pattern)
    print(
        f"Generated {len(points)} points for class pattern {class_pattern} with radius {sphere_radius}"
    )

    doc = App.newDocument()
    doc.Label = f"r{sphere_radius}_cp{class_pattern}_G"

    place_nang_partial = partial(
        place_nang,
        rad=sphere_radius - wiggle,
        cust_shape_step_doc="/Users/jcalvert/3DPrinting/NangSheathwScrew-Fusion.step",
    )
    topnangs, bottomnangs = placeOnVertices(doc, points, place_nang_partial)
    top = doc.addObject("Part::MultiFuse", "TopNangs")
    bottom = doc.addObject("Part::MultiFuse", "BottomNangs")
    top.Shapes = topnangs
    bottom.Shapes = bottomnangs
    doc.recompute()

    place_cutshape = partial(
        place_nang_shell,
        rad=sphere_radius,
        cust_shape_step_doc="/Users/jcalvert/3DPrinting/NangSheathwScrew-Fusion.step",
        outer_cut_depth=outer_cut_depth,
        inner_cut_depth=inner_cut_depth,
        cylinder_rad=shell_cylinder_rad,
    )
    topshapes, bottomshapes = placeOnVertices(doc, points, place_cutshape)

    edges = find_adjacent_edges([App.Vector(p[0], p[1], p[2]) for p in points])
    placeEdges(
        doc,
        topshapes,
        bottomshapes,
        edges,
        edge_diam,
        rad=sphere_radius,
        outer_cut_depth=outer_cut_depth,
        inner_cut_depth=inner_cut_depth,
        # TODO: Offset isn't working for some reason
        offset=shell_cylinder_rad,
    )

    top = doc.addObject("Part::MultiFuse", "Top")
    bottom = doc.addObject("Part::MultiFuse", "Bottom")
    top.Shapes = topshapes
    bottom.Shapes = bottomshapes
    doc.recompute()


# nang_ball_core(sphere_radius=43, class_pattern=[2, 2, 1])
nang_ball_core(sphere_radius=70, class_pattern=[2,1,1])
# nang_ball_core(sphere_radius=50, class_pattern=[0, 2, 1])
