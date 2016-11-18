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

BrainBrowser.VolumeViewer.modules.annotate = function(viewerP) {
  "use strict";
  var viewer = viewerP;

  console.log("Annotation module is loaded.");

  // Add keyboard controls
  addKeyboardControls();

  // We use this for triggering downloads.
  var elem = document.createElement('a');
  elem.id = 'anno-download';
  elem.style.display = 'none';
  document.body.appendChild(elem);

  function triggerUpdate(volume) {
    volume.display.forEach(function(panel) {
      panel.updateSlice();
    });
  }
  
  function closeAnnotation() {
    var elem = document.getElementById('anno-box');
    if (elem) {
      document.body.removeChild(elem);
    }
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
      name: "",
      points: [[point.x, point.y, point.z]],
      description: text,
      isClosed: false,
      color: "FFFFFF"
    };
    if (typeof volume.annotations === "undefined") {
      volume.annotations = [];
    }
    volume.annotations.push(annotation);

    var select = document.getElementById('anno-list-' + panel.volume_id);
    var option = document.createElement('option');
    option.text = text;
    option.value = panel.volume_id + ':' + (volume.annotations.length - 1);
    select.add(option);
  }

  function makeAnnotation() {
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
    //textarea.value = "x: " + x + " y: " + y;
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

    // Save the note.
    elem = document.getElementById('anno-save');
    elem.addEventListener("click",
                          function() {
                            saveAnnotation(textarea.value.trim());
                            closeAnnotation();
                          }, false);

    // Just close the note.
    elem = document.getElementById('anno-cancel');
    elem.addEventListener("click", closeAnnotation, false);

    elem = document.getElementById('anno-list-' + panel.volume_id);
    elem.addEventListener("click", function(e) {
      console.log('click: ' + e.target.value);
      var array = e.target.value.split(':');
      var volume_id = parseInt(array[0], 10);
      var n_anno = parseInt(array[1], 10);
      var volume = viewer.volumes[volume_id];
      var anno = volume.annotations[n_anno];
      volume.setWorldCoords(anno.points[0][0],
                            anno.points[0][1],
                            anno.points[0][2]);
      triggerUpdate(volume);
    }, false);
  }

  function addKeyboardControls() {
    document.addEventListener("keydown", function(event) {
      var key = event.which;
      
      var keys = {
        65: function() {
          makeAnnotation();
        },
        66: function() {
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
        }
      };

      if (typeof keys[key] === "function" && event.ctrlKey) {
        event.preventDefault();
        keys[key]();
      }
    });
  }
};

