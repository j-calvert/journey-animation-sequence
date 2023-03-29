import FreeCAD as App
import Part
from BOPTools import SplitFeatures, SplitAPI
from CompoundTools import Explode
import math
from itertools import combinations


import numpy as np




def create_cylinder_on_vertex(doc, vertex, radius, start, end):
    # Create a cylinder object
    cylinder = doc.addObject("Part::Cylinder", f"Cylinder")
    # Set the cylinder's radius
    cylinder.Radius = radius
    cylinder.Height = end - start
    # Calculate the rotation axis and angle to align the cylinder with the vertex
    rotation_axis = App.Vector(0, 0, 1).cross(vertex)
    rotation_angle = math.degrees(App.Vector(0, 0, 1).getAngle(vertex))
    # Create the placement with position at the origin and the calculated rotation
    placement = App.Placement(App.Vector(0, 0, 0), App.Rotation(rotation_axis, rotation_angle))
    placement.move(vertex.normalize() * start)
    # Set the cylinder's placement
    cylinder.Placement = placement
    return cylinder

def create_sphere_at_vertex(doc, vertex, radius):
    # Create a sphere object
    sphere = doc.addObject("Part::Sphere", "Sphere")
    # Set the sphere's radius
    sphere.Radius = radius
    # Create the placement with position at the vertex
    placement = App.Placement(vertex, App.Rotation(App.Vector(0, 0, 1), 0))
    # Set the sphere's placement
    sphere.Placement = placement
    return sphere

def create_slicing_plane(doc, radius):
    rp = radius + 1
    plane = doc.addObject("Part::Plane", "SlicingPlane")
    plane.Width = 2 * rp  # Make the plane larger than the object
    plane.Length = 2 * rp
    # Center the plane at the origin by moving it along its local Y-axis
    # Rotate the plane 90 degrees around the X-axis to make it lie on the XZ plane
    # plane.Placement.Rotation = App.Rotation(App.Vector(1, 0, 0), 90)
    plane.Placement.move(App.Vector(-rp, -rp, 0))
    return plane




'''
Create coordinates for a higher frequency, plane-faced or spherical,
icosahedron, octahedron or tetrahedron. For Class I and II patterns
freq (default 1) is the number of divisions along an edge, for Class III
patterns (and those specified by two numbers) freq is the number of times
the pattern is repeated along an edge. By default the edges are divided
into sections with an equal angle at the origin, a Class I pattern, and
the points are then projected onto a sphere.
'''

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
        return '(' + repr(self.v)[1:-1] + ')'

    def __repr__(self):
        return 'Vec(' + repr(self.v)[1:-1] + ')'

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
        v = list(map(lambda x, y: x+y, self.v, other.v))
        return Vec().fromlist(v)

    # Element-wise subtraction
    def __sub__(self, other):
        v = list(map(lambda x, y: x-y, self.v, other.v))
        return Vec().fromlist(v)

    # Element-wise multiplication by scalar
    def __mul__(self, scalar):
        v = list(map(lambda x: x*scalar, self.v))
        return Vec().fromlist(v)

    # Element-wise pre-multiplication by scalar
    def __rmul__(self, scalar):
        return self.__mul__(scalar)

    # Element-wise division by scalar
    def __truediv__(self, scalar):
        return self.__mul__(1/scalar)

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
        r = math.sqrt(self.v[0]**2+self.v[1]**2)
        initial_ang = math.atan2(self.v[1], self.v[0])
        final_ang = initial_ang + ang
        return Vec(r*math.cos(final_ang), r*math.sin(final_ang), self.v[2])

    # Cross product v0 x v1
    @staticmethod
    def cross(v0, v1):
        return Vec(v1[2]*v0[1] - v1[1]*v0[2],
                   v1[0]*v0[2] - v1[2]*v0[0],
                   v1[1]*v0[0] - v1[0]*v0[1])

    # Dot product v0 . v1
    @staticmethod
    def dot(v0, v1):
        return sum(map(lambda x, y: x*y, v0.v, v1.v))

    # Triple product v0. (v1 x v2)
    @staticmethod
    def triple(v0, v1, v2):
        return Vec.dot(v0, Vec.cross(v1, v2))


def get_octahedron(verts, faces):
    """Return an octahedron"""
    X = 0.25 * math.sqrt(2)
    verts.extend([Vec(0.0, 0.5, 0.0), Vec(X, 0.0, -X),
                  Vec(X, 0.0, X), Vec(-X, 0.0, X),
                  Vec(-X, 0.0, -X), Vec(0.0, -0.5, 0.0)])

    faces.extend([(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1),
                  (5, 2, 1), (2, 5, 3), (3, 5, 4), (4, 5, 1)])


def get_tetrahedron(verts, faces):
    """Return an tetrahedron"""
    X = 1 / math.sqrt(3)
    verts.extend([Vec(-X, X, -X), Vec(-X, -X, X),
                  Vec(X, X, X), Vec(X, -X, -X)])
    faces.extend([(0, 1, 2), (0, 3, 1), (0, 2, 3), (2, 1, 3)])


def get_ico_coords():
    """Return icosahedron coordinate values"""
    phi = (math.sqrt(5) + 1) / 2
    rad = math.sqrt(phi+2)
    return 1/rad, phi/rad


def get_triangle(verts, faces):
    """Return an triangle"""
    if 1:
        Y = math.sqrt(3.0) / 12.0
        Z = -0.8
        verts.extend([Vec(-0.25, -Y, Z), Vec(0.25, -Y, Z),
                      Vec(0.0, 2 * Y, Z)])
        faces.extend([(0, 1, 2)])
    else:
        X, Z = get_ico_coords()
        verts.extend([Vec(-X, 0.0, -Z), Vec(X, 0.0, -Z),
                      Vec(0.0, Z, -X), Vec(0.0, -Z, -X)])
        faces.extend([(0, 1, 2), (0, 3, 1)])


def get_icosahedron(verts, faces):
    """Return an icosahedron"""
    X, Z = get_ico_coords()
    verts.extend([Vec(-X, 0.0, Z), Vec(X, 0.0, Z), Vec(-X, 0.0, -Z),
                  Vec(X, 0.0, -Z), Vec(0.0, Z, X), Vec(0.0, Z, -X),
                  Vec(0.0, -Z, X), Vec(0.0, -Z, -X), Vec(Z, X, 0.0),
                  Vec(-Z, X, 0.0), Vec(Z, -X, 0.0), Vec(-Z, -X, 0.0)])

    faces.extend([(0, 4, 1), (0, 9, 4), (9, 5, 4), (4, 5, 8), (4, 8, 1),
                  (8, 10, 1), (8, 3, 10), (5, 3, 8), (5, 2, 3), (2, 7, 3),
                  (7, 10, 3), (7, 6, 10), (7, 11, 6), (11, 0, 6), (0, 1, 6),
                  (6, 1, 10), (9, 0, 11), (9, 11, 2), (9, 2, 5), (7, 2, 11)])


def get_poly(poly, verts, edges, faces):
    """Return the base polyhedron"""
    if poly == 'i':
        get_icosahedron(verts, faces)
    elif poly == 'o':
        get_octahedron(verts, faces)
    elif poly == 't':
        get_tetrahedron(verts, faces)
    elif poly == 'T':
        get_triangle(verts, faces)
    else:
        return 0

    for face in faces:
        for i in range(0, len(face)):
            i2 = i + 1
            if(i2 == len(face)):
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
                len = math.sin(i * ang / freq) / \
                    math.sin(math.pi / 2 + ang / 2 - i * ang / freq)
                v[vtx].append(unit_edge_vec * len)

    for (i, j) in grid.values():

        if (i == 0) + (j == 0) + (i + j == freq) == 2:   # skip vertex
            continue
        # skip edges in one direction
        if (i == 0 and face[2] > face[0]) or (
                j == 0 and face[0] > face[1]) or (
                i + j == freq and face[1] > face[2]):
            continue

        n = [i, j, freq - i - j]
        v_delta = (v[0][n[0]] + v[(0-1) % 3][freq - n[(0+1) % 3]] -
                   v[(0-1) % 3][freq])
        pt = f_verts[0] + v_delta
        if not div_by_len:
            for k in [1, 2]:
                v_delta = (v[k][n[k]] + v[(k-1) % 3][freq - n[(k+1) % 3]] -
                           v[(k-1) % 3][freq])
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
    order = ['first', 'second']
    num_parts = val_str.count(',')+1
    vals = val_str.split(',', 2)
    if num_parts == 1:
        if vals[0] == '1':
            pat = [1, 0, 1]
        elif vals[0] == '2':
            pat = [1, 1, 1]
        else:
            raise Exception(
                'class type can only be 1 or 2 when a single value is given')

    elif num_parts == 2:
        pat = []
        for i, num_str in enumerate(vals):
            try:
                num = int(num_str)
            except:
                raise Exception(
                    order[i] + ' class pattern value not an integer')
            if num < 0:
                raise Exception(
                    order[i] + ' class pattern cannot be negative')
            if num == 0 and i == 1 and pat[0] == 0:
                raise Exception(
                    ' class pattern values cannot both be 0')
            pat.append(num)

        rep = math.gcd(*pat)
        pat = [pat_num//rep for pat_num in pat]
        pat.append(rep)

    else:
        raise Exception(
            'class type contains more than two values')

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
    #     choices=['i', 'o', 't', 'T'],
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

    



# Create a new document
doc = App.newDocument()
checkDoc = App.newDocument()
# Trial and error (based on class_pattern, below)
sphere_radius = 37
wall_thickness = 5
wiggle = 1 # avoid actual tangents/infintesimals
# Measurements
nozzle_radius = 8.75 / 2
body_radius = 17.75 / 2
neck_height = 8




args = {'repeats': 1, 'polyhedron': 'i', 'class_pattern' : [2,2,1], 'flat_faced': False, 'equal_length': False }

verts = []
edges = {}
faces = []
get_poly(args['polyhedron'], verts, edges, faces)

(M, N, reps) = args['class_pattern']
repeats = args['repeats'] * reps
freq = repeats * (M**2 + M*N + N**2)

grid = {}
grid = make_grid(freq, M, N)

points = verts
for face in faces:
    if args['polyhedron'] == 'T':
        face_edges = (0, 0, 0)  # generate points for all edges
    else:
        face_edges = face
    points[len(points):len(points)] = grid_to_points(
        grid, freq, args['equal_length'],
        [verts[face[i]] for i in range(3)], face_edges)

if not args['flat_faced']:
    points = [p.unit() for p in points]  # Project onto sphere


base_sphere = create_sphere_at_vertex(doc, App.Vector(0,0,0), sphere_radius)
# hollow_center = create_sphere_at_vertex(doc, App.Vector(0,0,0), sphere_radius - wall_thickness)
# cut = doc.addObject("Part::Cut", "Shell")
# cut.Base = base_sphere
# cut.Tool = hollow_center
# doc.recompute()
# base_sphere = cut
cylinders = []


for vertex in points:
    # Normalize the vertex and project it to the surface of a sphere
    normalized_vertex = np.array(vertex) / vertex.mag() * sphere_radius
    # print(normalized_vertex)

    # Convert the numpy array to a FreeCAD vector
    # fc_vertex = App.Vector(vertex[0], vertex[1], vertex[2])
    fc_vertex = App.Vector(normalized_vertex[0], normalized_vertex[1], normalized_vertex[2])

    cylinder = create_cylinder_on_vertex(doc, fc_vertex, nozzle_radius, sphere_radius - (wall_thickness + wiggle), sphere_radius + wiggle)
    create_cylinder_on_vertex(checkDoc, fc_vertex, body_radius, sphere_radius + neck_height, sphere_radius + neck_height + 50)
    cylinders.append(cylinder)


# Perform boolean subtraction
cylinders_compound = doc.addObject("Part::Compound", "cylinders_compound")

cylinders_compound.Links = cylinders
doc.recompute()

cut = doc.addObject("Part::Cut", "CutFinal")
cut.Base = base_sphere
cut.Tool = cylinders_compound
doc.recompute()

cylinders_compound.ViewObject.Visibility = False


checkDoc.recompute()
# Create a splitting plane (XY Plane)
plane = create_slicing_plane(doc, sphere_radius)



halves = SplitAPI.slice(cut.Shape, [plane.Shape], 'Split', tolerance = 0.0).Solids

top_half = doc.addObject("Part::Feature", "TopHalf")
top_half.Shape = halves[0]
bottom_half = doc.addObject("Part::Feature", "BottomHalf")
bottom_half.Shape = halves[1]

bottom_half.Placement.Rotation = App.Rotation(App.Vector(0, 1, 0), 180)
bottom_half.Placement.move(App.Vector(2 * (sphere_radius + wiggle), 0, 0))

doc.recompute()

base_sphere.ViewObject.Visibility = False
cut.ViewObject.Visibility = False
plane.ViewObject.Visibility = False

doc.recompute()


# to run in freecad:
# exec(open('/Users/jcalvert/journey-animation-sequence/misc/generate3Dhubprints.py').read())