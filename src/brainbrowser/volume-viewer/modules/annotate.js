/*
* BrainBrowser: Web-based Neurological Visualization Tools
* (https://brainbrowser.cbrain.mcgill.ca)
*
* Copyright (C) 2011
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
 * Simple annotations for the volume viewer.
 */

BrainBrowser.VolumeViewer.modules.annotate = function(viewer) {
  "use strict";

  viewer.annotate = {};

  /* Create the element we use when triggering downloads.
   */
  var elem = document.createElement('a');
  elem.id = 'anno-download';
  elem.style.display = 'none';
  document.body.appendChild(elem);

  /* Update the volume display. */
  function triggerUpdate(volume) {
    volume.display.forEach(function(panel) {
      panel.updateSlice();
    });
  }

  /* Private function that just deletes the UI element for the
   * annotation.
   */
  function closeAnnotation() {
    var elem = document.getElementById('anno-box');
    if (elem) {
      document.body.removeChild(elem);
    }
  }

  /* Adds an entry to the selection box.
   * This might be better handled by moving some or all of the
   * functionality into the UI, as I am not happy embedding the
   * ID of an HTML element this module isn't responsible for
   * creating!
   */
  function addToSelect(vol_id, annotation) {
    var select = document.getElementById('anno-list-' + vol_id);
    var option = document.createElement('option');
    option.text = annotation.name;
    select.add(option);
  }

  function saveAnnotation(text) {
    if (!viewer.active_panel)
      return;
    if (text.length === 0)
      return;
    var panel = viewer.active_panel;
    var volume = panel.volume;
    var point = volume.getWorldCoords();
    var annotation = {
      name: text,
      points: [[point.x, point.y, point.z]],
      description: "",
      isClosed: false,
      color: "FFFFFF"
    };
    if (typeof volume.annotations === "undefined") {
      volume.annotations = [];
    }
    volume.annotations.push(annotation);

    addToSelect(panel.volume_id, annotation);

    triggerUpdate(volume);
  }

  viewer.annotate.create = function() {
    if (!viewer.active_panel)
      return;
    var panel = viewer.active_panel;
    var canvas = panel.canvas;
    var cursor = panel.getCursorPosition();
    var newbox = document.createElement('div');
    var x = cursor.x + canvas.offsetLeft;
    var y = cursor.y + canvas.offsetTop;

    newbox.style.backgroundColor = 'beige';
    newbox.style.border = 'thin solid gray';
    newbox.id = "anno-box";
    newbox.style.position = "absolute";
    newbox.style.top = y + 'px';
    newbox.style.left = x + 'px';
    
    var textarea = document.createElement('textarea');
    textarea.id = 'anno-body';
    textarea.style.width = '180pt';
    textarea.style.display = 'block';
    newbox.appendChild(textarea);
    
    document.body.appendChild(newbox);

    var elem = document.createElement('a');
    elem.setAttribute('href', '#');
    elem.id = 'anno-save';
    elem.style.display = 'inline-block';
    elem.style.width = (newbox.offsetWidth / 2) + 'px';
    elem.innerHTML = 'Save';
    newbox.appendChild(elem);

    elem = document.createElement('a');
    elem.setAttribute('href', '#');
    elem.id = 'anno-cancel';
    elem.style.display = 'inline-block';
    elem.style.width = (newbox.offsetWidth / 2) + 'px';
    elem.innerHTML = 'Cancel';
    newbox.appendChild(elem);

    /* Add a link to save the note. */
    elem = document.getElementById('anno-save');
    elem.addEventListener("click",
                          function() {
                            saveAnnotation(textarea.value.trim());
                            closeAnnotation();
                          }, false);

    /* Another link to close the note without saving. */
    elem = document.getElementById('anno-cancel');
    elem.addEventListener("click", closeAnnotation, false);

    textarea.focus();
  };

  /* Called when a new annotation should be selected.
   */
  viewer.annotate.select = function(vol_id, anno_id) {
    console.log('click: ' + vol_id + ' ' + anno_id);
    if (vol_id >= viewer.volumes.length) {
      return;
    }
    var volume = viewer.volumes[vol_id];
    if (anno_id >= volume.annotations.length) {
      return;
    }
    var pt = volume.annotations[anno_id].points[0];
    volume.setWorldCoords(pt[0], pt[1], pt[2]);
    triggerUpdate(volume);
  };

  /* Called when we want to download an annotations file.
   */
  viewer.annotate.download = function() {
    if (!viewer.active_panel)
      return;
    var panel = viewer.active_panel;
    var volume = panel.volume;
    var date = new Date();
    var data = {
      date: date.toISOString(),
      name: volume.name,
      annotations: volume.annotations
    };
    var anno_str = JSON.stringify(data, null, 2);
    var data_str = "data:text/json;charset=utf-8," +
      encodeURIComponent(anno_str);
    var elem = document.getElementById('anno-download');
    elem.setAttribute("href", data_str);
    elem.setAttribute("download", "annotation.json");
    elem.click();
  };

  /* This function loads an annotations file, adds the appropriate
   * entries in the selection box, and updates the slice display.
   */
  viewer.annotate.load = function(vol_id, file_input) {
    BrainBrowser.loader.loadFromFile(file_input, function(json_text) {
      var volume = viewer.volumes[vol_id];
      var data = JSON.parse(json_text);
      if (typeof volume.annotations === 'undefined') {
        volume.annotations = [];
      }
      data.annotations.forEach( function ( anno ) {
        volume.annotations.push(anno);
        addToSelect(vol_id, anno);
      });
      triggerUpdate(volume);
    });
  };
};

