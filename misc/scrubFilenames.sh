#!/bin/bash
# Use with, e.g. find sweden_norway -type f -exec scrub.sh {} \;

base_url="http://127.0.0.1:5500/?src="
file=$1
# Replace problematic spaces and commas in the file name with underscores
# Problematic for what?  Maybe some stuff that I don't do any more?  E.g. Using as URL parameters
new_file=`echo "$file" | tr ' ' '_' | tr ',' '_'`
# Rename the file
mv "$file" "$new_file"
url="$base_url$new_file"
echo $url
