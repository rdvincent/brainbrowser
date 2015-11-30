/*
* BrainBrowser: Web-based Neurological Visualization Tools
* (https://brainbrowser.cbrain.mcgill.ca)
*
* Copyright (C) 2011-2015
* The Royal Institution for the Advancement of Learning
* McGill University
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
* Author: Robert D. Vincent <robert.d.vincent@mcgill.ca>
*
* BigBrain in the volume viewer, by accessing pre-rendered slices.
*/

(function() {
  "use strict";

  var VolumeViewer = BrainBrowser.VolumeViewer;
  var TILE_CX = 256;
  var TILE_CY = 256;

  var host = "132.216.122.239"; /* ace-toroviewer-1 is at 132.216.122.239 */

  VolumeViewer.volume_loaders.bigbrain = function(description, callback) {
    if (description.host_name !== undefined)
      host = description.host_name;
    createBigbrainVolume(callback);
  }

  function getURL(axis, slice, level, x, y) {
    var numTiles = 1 << level;
    var url;
    switch (axis) {
    case 'yspace':
      /* URL for Y-axis */
      url = "http://" + host + "/y/l" + level + "/x" + x + "/y" + slice + "/z" + (numTiles-y-1) + ".png";
      break;
    case 'xspace':
      /* URL for X-axis */
      url = "http://" + host + "/x/l" + level + "/x" + slice + "/y" + x + "/z" + (numTiles-y-1) + ".png";
      break;
    case 'zspace':
      url = "http://" + host + "/z/l" + level + "/x" + x + "/y" + (numTiles-y-1) + "/z" + slice + ".png";
      break;
    }
    return url;
  }

  function createBigbrainVolume(callback) {
    var header = {};
    header.xspace = {};
    header.yspace = {};
    header.zspace = {};

    header.order = ["xspace", "yspace", "zspace"];

    header.xspace.space_length = 8192;
    header.yspace.space_length = 8192;
    header.zspace.space_length = 8192;
    
    header.xspace.step = 0.03;
    header.yspace.step = 0.03;
    header.zspace.step = 0.03;

    header.xspace.start = -(header.xspace.space_length * header.xspace.step) / 2.0;
    header.yspace.start = -(header.yspace.space_length * header.yspace.step) / 2.0;
    header.zspace.start = -(header.zspace.space_length * header.zspace.step) / 2.0;
    header.xspace.direction_cosines = [1,0,0];
    header.yspace.direction_cosines = [0,1,0];
    header.zspace.direction_cosines = [0,0,1];

    header.voxel_min = 0;
    header.voxel_max = 255;
    
    var volume = VolumeViewer.createVolume(header, null);
    volume.type = "bigbrain";
    volume.intensity_min = volume.header.voxel_min;
    volume.intensity_max = volume.header.voxel_max;
    volume.saveOriginAndTransform(header);
    volume.pending = [];

    volume.slice = function(axis, slice_num, time) {
      var header = volume.header;
      var axis_space = header[axis];
      var width_space = axis_space.width_space;
      var height_space = axis_space.height_space;
      slice_num = slice_num === undefined ? volume.position[axis] : slice_num;

      var slice = {
        axis: axis,
        data: null,
        width_space: header[axis].width_space,
        height_space: header[axis].height_space,
        width: axis_space.width,
        height: axis_space.height,
        number: slice_num
      };
      return slice;
    };

    function getTile(url, level, x, y, zoom, panel, target_context, callback) {
      var image = new Image();

      volume.pending.push(image);

      var num_tiles = 1 << level;

      /* effective size of the overall canvas */
      var cx = panel.canvas.width;
      var cy = panel.canvas.height;
      /* size of each tile on the canvas */
      var cx_tile = TILE_CX * zoom / num_tiles;
      var cy_tile = TILE_CY * zoom / num_tiles;
      var cx_tiles = cx_tile * num_tiles;
      var cy_tiles = cy_tile * num_tiles;

      image.onload = function() {
        var index = volume.pending.indexOf(image);
        if (index >= 0)
          volume.pending.splice(index, 1);

        /* create a canvas and render the image into it. */
        var canvas = document.createElement( 'canvas' );
        canvas.width = image.width;
        canvas.height = image.height;
        var rendered = canvas.getContext('2d');
        rendered.drawImage( image, 0, 0 );

        var origin = {
          x: panel.image_center.x - cx_tiles / 2,
          y: panel.image_center.y - cy_tiles / 2,
        }
        var pos_x = origin.x+cx_tile*x;
        var pos_y = origin.y+cy_tile*y;
        var siz_x = cx_tile;
        var siz_y = cy_tile;

        target_context.drawImage(
            rendered.canvas,
            0,
            0,
            rendered.canvas.width,
            rendered.canvas.height,
            pos_x,
            pos_y,
            siz_x,
            siz_y
        );

        if (volume.pending.length == 0 && BrainBrowser.utils.isFunction(callback))
          callback(target_context);
      };

      image.onabort = image.onerror = function(){
        var index = volume.pending.indexOf(image);
        if (index >= 0)
          volume.pending.splice(index, 1);
        if (volume.pending.length == 0 && BrainBrowser.utils.isFunction(callback))
          callback(target_context);
      };
      image.src = url;
    }

    volume.getSliceImage = function(slice, zoom, contrast, brightness, panel, callback) {
      zoom = zoom || 1;

      //console.log("bigbrain.getSliceImage(" + slice.axis + ", " + slice.number + ", " + zoom + ")");

      if (slice.number === undefined)
        return null;

      var color_map = volume.color_map;
      var error_message;

      if (!color_map) {
        error_message = "No color map set for this volume. Cannot render slice.";
        volume.triggerEvent("error", error_message);
        throw new Error(error_message);
      }

      var xstep = slice.width_space.step;
      var ystep = slice.height_space.step;
      var target_width = panel.canvas.width;
      var target_height = panel.canvas.height;
      var target_canvas = document.createElement( 'canvas' );
      target_canvas.width = panel.canvas.width;
      target_canvas.height = panel.canvas.height;
      var target_context = target_canvas.getContext('2d');
      var target_image = target_context.getImageData(0, 0, target_width, target_height);
      var level = 0;
      if (zoom >= 17) level = 5;
      else if (zoom >= 9) level = 4;
      else if (zoom >= 5) level = 3;
      else if (zoom >= 3) level = 2;
      else if (zoom > 1) level = 1;

      var num_tiles = 1 << level;
      var x = 0;
      var y = 0;

      var cx = panel.canvas.width;
      var cy = panel.canvas.height;
      /* size of each tile on the canvas */
      var cx_tile = TILE_CX * zoom / num_tiles;
      var cy_tile = TILE_CY * zoom / num_tiles;
      var cx_tiles = cx_tile * num_tiles;
      var cy_tiles = cy_tile * num_tiles;
      var n = 0;

      var origin = {
        x: panel.image_center.x - cx_tiles / 2,
        y: panel.image_center.y - cy_tiles / 2,
      }

      for (x = 0; x < num_tiles; x++)
        for (y = 0; y < num_tiles; y++) {
          var pos_x = origin.x+cx_tile*x;
          var pos_y = origin.y+cy_tile*y;

          if (pos_x + cx_tile < 0 || pos_x > cx)
            continue;
          if (pos_y + cy_tile < 0 || pos_y > cy)
            continue;

          /* don't get tiles that are outside the view 
           */
          var url = getURL(slice.axis, slice.number, level, x, y);
          getTile(url, level, x, y, zoom, panel, target_context, callback);
          n++;
        }
      //console.log("requested " + n + " tiles at level " + level);
      return target_image;
    };

    volume.getIntensityValue = function(i, j, k, time) {
      return 0;
    };

    if (BrainBrowser.utils.isFunction(callback)) {
      callback(volume);
    }
  }
}());
