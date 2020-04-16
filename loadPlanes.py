import json
import bpy
import os
import math

IMAGES_PER_CIRCLE = 8
IMAGES_PER_SPHERE = 12
CIRCLE_RADIUS = 3

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

bpy.data.scenes[0].render.engine = 'CYCLES'
bpy.data.scenes[0].cycles.device = 'GPU'
bpy.data.scenes[0].render.film_transparent = True
bpy.data.scenes[0].cycles.max_bounces = 0
bpy.data.scenes[0].cycles.diffuse_bounces = 0
bpy.data.scenes[0].cycles.glossy_bounces = 0
bpy.data.scenes[0].cycles.transparent_max_bounces = 0
bpy.data.scenes[0].cycles.transmission_bounces = 0
bpy.data.scenes[0].render.tile_x = 128
bpy.data.scenes[0].render.tile_y = 128
bpy.data.scenes[0].cycles.preview_samples = 1
bpy.data.scenes[0].cycles.samples = 1
bpy.ops.object.camera_add(enter_editmode=False, align='VIEW', location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
bpy.data.cameras[0].type = 'PANO'
bpy.data.cameras[0].cycles.fisheye_fov = math.pi*2
bpy.data.cameras[0].cycles.panorama_type = 'EQUIRECTANGULAR'
bpy.data.scenes[0].camera = bpy.data.objects[0]

with open("E:/Georg/Projekte/NodeJS/VirtualChoirAutomation/vidSync.json", encoding="utf-8") as f:
    vidSync = json.load(f)
    f.close()
    
for voice in vidSync['voices']:
    for vid in voice['videos']:
        filename = os.path.basename(vid['filename'])
        filepath = os.path.dirname(vid['filename'])
        print("Loading " + vid['filename'])
        print(bpy.ops.import_image.to_plane(
                shader='SHADELESS',
                files=[{'name': filename}],
                directory=filepath,
                size_mode='ABSOLUTE'
            ))
    
i = 0        
for plane in bpy.data.objects:
    if (plane.type == 'MESH'):
        col = i%IMAGES_PER_CIRCLE
        layer = math.floor(i/IMAGES_PER_CIRCLE)
        if (layer%2 == 1):
            layer = (layer + 1)/2
        else:
            layer = -layer/2
        heightCorrection = math.cos(math.pi*2/IMAGES_PER_SPHERE*layer)
        plane.location[0] = math.cos(math.pi*2/IMAGES_PER_CIRCLE*col)*CIRCLE_RADIUS*heightCorrection
        plane.location[1] = math.sin(math.pi*2/IMAGES_PER_CIRCLE*col)*CIRCLE_RADIUS*heightCorrection
        plane.location[2] = math.sin(math.pi*2/IMAGES_PER_SPHERE*layer)*CIRCLE_RADIUS
        plane.rotation_euler[0] = math.pi*2/IMAGES_PER_SPHERE*layer+math.pi/2
        plane.rotation_euler[1] = 0
        plane.rotation_euler[2] = math.pi*2/IMAGES_PER_CIRCLE*col-math.pi/2
        i+=1
    
bpy.ops.object.select_all(action='DESELECT')