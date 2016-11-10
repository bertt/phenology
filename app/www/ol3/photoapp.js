proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs');

// globals, todo: wrap globals in objects?
var geolocation = null;
var overlaypicture_url = null;
var overlayPictureId = 0;
var Photolayer = null;
var photodata = null;

// convert degrees to radians
Number.prototype.toRad = function() { // helper
    return this * Math.PI / 180;
}

// calculate world distance in km between two world points (lat/lon)
function calculateDistance(pos1, pos2) {
    var R = 6371; // km
    var dLon = (pos2[0] - pos1[0]).toRad();
    var dLat = (pos2[1] - pos1[1]).toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(pos1[1].toRad()) * Math.cos(pos2[1].toRad()) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

// upload picture contents (photodata) to photoserver
function uploadphotodata(imagedata, rootid, callback) {
  var location = [0, 0];
  var accuracy = 0;
  if (geolocation) {
      location = geolocation.getPosition();
      if (location) {
        location = ol.proj.transform(location, 'EPSG:3857', 'EPSG:4326');
        accuracy = geolocation.getAccuracy();
      } else {
        callback("Error", "Required photo location unknown");
        return;
      }
  }

  var xhr = new XMLHttpRequest();
  var formData = 'photo=' + encodeURIComponent(imagedata) + '&latitude=' + location[1] + '&longitude=' + location[0] + '&accuracy=' + accuracy + "&username=" + localStorage.email +  "&hash=" + localStorage.hash + "&rootid=" + rootid + "&deviceid=" + localStorage.deviceid + "&devicehash=" + localStorage.devicehash;
  xhr.open("POST", server+"/photoserver/sendphoto");
  //xhr.open("POST", server+"/photoserver/sendphoto");
  xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
  xhr.onreadystatechange = function (event) {
     if (xhr.readyState === 4) {
         if (xhr.status === 200) {
           callback (null, xhr.responseText);
         } else {
            callback("Error", xhr.statusText);
         }
     }
  };
  xhr.send(formData);
}

// uploads photo and updates CameraWindow
function uploadphoto()
{
  var status = document.querySelector('#caminfo');
  status.innerHTML = "versturen..."

  uploadphotodata(photodata, overlayPictureId, function (err, result) {
    if (err)
    {
      status.innerHTML = "Error: " + result;
      photodata = null; // remove picture from memory
      setTimeout(cameraWindow.closecamera, 2000);
    } else {
      status.innerHTML = result;
      photodata = null; // remove picture from memory
      setTimeout(cameraWindow.closecamera, 1000);
    }
  });
}

var browserlanguage = navigator.language || navigator.userLanguage;

var onDeviceReady = function() {
  //on picture
  //cordova.plugins.camerapreview.setOnPictureTakenHandler(function(result){}
  console.log(navigator.globalization);

  CameraPreview.setOnPictureTakenHandler(function(result){
    //uploadphotodata("data:image/jpeg;base64," + result);

    // take, upload, retake, cancel
    document.querySelector("#takephotobutton").classList.add("hidden");
    document.querySelector("#cancelphotobutton").classList.add("shiftedleft");
    document.querySelector("#uploadphotobutton").classList.add("shiftedleft");
    document.querySelector("#retakephotobutton").classList.add("shiftedleft");
    document.querySelector("#uploadphotobutton").classList.remove("hidden");
    document.querySelector("#retakephotobutton").classList.remove("hidden");
    photodata = result;
  });
}

document.addEventListener('deviceready', onDeviceReady, false);

function checkCameraPermissions(me, okCallback)
{
  if (typeof cordova !== 'undefined') {
    // check Camera Permissions
    var permissions = cordova.plugins.permissions;
    permissions.hasPermission(permissions.CAMERA, function(status) {
      if (!status.hasPermission) {
        permissions.requestPermission(permissions.CAMERA, function(status){
          if (status.hasPermission) {
            // yes we have received permission!
            okCallback.call(me);
          }
        }, null);
      } else {
        // we have permission
        okCallback.call(me);
      }
    }, null);
  }
}

function showcamera(camerabackground) { // displays the camera in the camerawindow

    var tapEnabled = true;
    var dragEnabled = true;
    var toBack = true; // camera z-value can either be completely at the back or completey on top

    // reset after-picture-taken buttons to hidden
    document.querySelector("#takephotobutton").classList.remove("hidden");
    document.querySelector("#uploadphotobutton").classList.add("hidden");
    document.querySelector("#retakephotobutton").classList.add("hidden");
    document.querySelector("#cancelphotobutton").classList.remove("shiftedleft");
    document.querySelector("#uploadphotobutton").classList.remove("shiftedleft");
    document.querySelector("#retakephotobutton").classList.remove("shiftedleft");


    if (typeof cordova !== 'undefined') { /* test for non-cordova environments */
        var width = screen.width; //camerabackground.offsetWidth;
        //var width = window.device.width;
        var height = screen.height; //camerabackground.offsetHeight;

        // show or hide overlaypicture
        var pic = document.getElementById("overlaypicture");
        if (overlaypicture_url) { // global var
          pic.src = overlaypicture_url;
          pic.onload = function () {
            pic.classList.remove("hidden");
          }
        } else {
          pic.classList.add("hidden");
        }

        document.querySelector("#caminfo").innerHTML = "width: " + width + ", height: " + height + ", ratio: " + window.devicePixelRatio;
        var x = (screen.width - width) / 2, y = (screen.height - height)/2;

        CameraPreview.startCamera({x: x, y: y, width: width, height: height, camera: "back", tapPhoto: tapEnabled, previewDrag: dragEnabled, toBack: toBack});
        CameraPreview.setZoom(0);
    }
}
function hidecamera() { // removes the camera from the camerawindow
    if (typeof cordova !== 'undefined') { /* test for non-cordova environments */
        //cordova.plugins.camerapreview.stopCamera();
        CameraPreview.stopCamera();
    }
}

var cameraWindow = {
  resetCamera: function() {
    hidecamera();
    setTimeout(function() {showcamera(cameraWindow.camerabackground);}, 300);
  },
  takephoto: function () {
    // fires cordova.plugins.camerapreview.setOnPictureTakenHandler
    if (typeof cordova !== 'undefined') {
      CameraPreview.takePicture({maxWidth: 640, maxHeight: 640});
    }
  },
  closecamera: function() {
      hidecamera();
      if (typeof StatusBar !== 'undefined') {
          StatusBar.show();
      }
      cameraWindow.mapdiv.classList.remove('hidden');
      cameraWindow.camerabackground.classList.remove('visible');
      document.removeEventListener("backbutton", cameraWindow.closecamera, false);
      updatephotos();
  },
  show: function() {
    checkCameraPermissions(this, function() {
      this.mapdiv = document.querySelector('#mapcontainer');
      this.mapdiv.classList.add('hidden');
      this.camerabackground = document.querySelector("#camerabackground");
      this.camerabackground.classList.add('visible');
      if (typeof StatusBar !== 'undefined') {
          StatusBar.hide(); // uses cordova plugin add cordova-plugin-statusbar
      }

      showcamera(this.camerabackground);

      window.addEventListener("orientationchange", function() {
        if (!document.querySelector("#takephotobutton").classList.contains("hidden")) {
          cameraWindow.resetCamera();
        }
      });


      this.takephotobutton = document.querySelector('#takephotobutton');
      this.takephotobutton.addEventListener('click', this.takephoto);

      document.querySelector('#uploadphotobutton').addEventListener('click', uploadphoto);
      document.querySelector('#retakephotobutton').addEventListener('click', this.resetCamera);

      this.closecamerabutton = document.querySelector('#cancelphotobutton');

      document.addEventListener("backbutton", this.closecamera, false);
      this.closecamerabutton.addEventListener('click', this.closecamera);
    });
  }
}

var layerSelector = {
  toggle: function() {
    var layerchooser = document.querySelector('#layerchooser');
    layerchooser.classList.toggle('visible');
  }
}

var popupMenu = {
  toggle: function() {
    var popupmenu = document.querySelector('#popupmenu');
    popupmenu.classList.toggle('visible');
  }
}

// adds or reloads photo positions into Photolayer
function updatephotos()
{
  if (Photolayer) {
    // update source
    Photolayer.setSource(
        new ol.source.Vector({
          projection: 'EPSG:4326',
          url: server + '/photoserver/getphotos?' + new Date().getTime(), // File created in node
          format: new ol.format.GeoJSON()
        })
    )
  } else {
    Photolayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        projection: 'EPSG:4326',
        url: server + '/photoserver/getphotos?0', // File created in node
        format: new ol.format.GeoJSON()
    }),
      style:  new ol.style.Style({
        image: new ol.style.RegularShape({ radius: 12, points: 4, angle: Math.PI / 4, fill: new ol.style.Fill({color: 'red'}), stroke: new ol.style.Stroke({color: "black", width: 1})})
        //image: new ol.style.Circle({ radius: 4, fill: new ol.style.Fill({color: 'red'}), stroke: new ol.style.Stroke({color: "black", width: 1})})

      })
    });
  }
  return Photolayer;
}

function loadmap() {
  var OpenStreetMapLayer = new ol.layer.Tile({
      source: new ol.source.OSM({
        url: "http://saturnus.geodan.nl/mapproxy/osm/tiles/osmgrayscale_EPSG900913/{z}/{x}/{y}.png?origin=nw"
      })
  });


  updatephotos(); // loads global var Photolayer

  var layers = [
      OpenStreetMapLayer,
      Photolayer
  ];
  var map = new ol.Map({
      layers: layers,
      target: 'map',
      controls: [],
      view: new ol.View({
          projection: 'EPSG:3857',
          center: ol.proj.transform([4.913024, 52.34223], 'EPSG:4326', 'EPSG:3857'), //Geodan Amsterdam
          zoom: 16
      })
  });
  return map;
}

function displayError(message)
{
  var info = document.getElementById('infobox');
  info.innerHTML = message;
  info.style.display = '';
}

// ensure this device is registered with server
function ensureDeviceRegistration(done)
{
   if (localStorage) {
     var email = localStorage.email;
     var hash = localStorage.hash;
     var deviceid = localStorage.deviceid;
     var devicehash = localStorage.devicehash;
     if ((!deviceid) || (deviceid=="undefined") || (!devicehash) || (devicehash=="undefined") ) {
        var xhr = new XMLHttpRequest();
        var formData = "username=" + email +  "&hash=" + hash;
        xhr.open("POST", server+"/photoserver/createdevice");
        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
        // xhr.responseType = 'json'; // DOES NOT WORK ON ANDROID 4.4!
        xhr.onreadystatechange = function (event) {
           if (xhr.readyState === 4) {
               if (xhr.status === 200) {
                 var result = JSON.parse(xhr.responseText);
                 localStorage.deviceid = result.deviceid;
                 localStorage.devicehash = result.devicehash;
                 if (done) {
                    done(true);
                 }
               } else {
                 if (done) {
                   done(false);
                 }
                 console.log ("Error registering device: " + xhr.statusText);
               }
           }
        };
        xhr.send(formData);
    } else {
      // device already registered
      if (done) {
        done(true);
      }
    }
  } else {
    // cannot register without localStorage
    if (done) {
      done(false);
    }
  }
}


var setup = function() {
    if (typeof cordova !== 'undefined') {
      // app-version
    } else {
      // web-version, hide camera button
      document.querySelector("#camera-altbutton").classList.add("hidden");
    }
    var map = loadmap();

    // feature popup - info
    var info = document.querySelector("#photopopup");
    var activeFeature = null;

    var getFeatureFromPixel = function(pixel, callback) {

      var resultfeature = null;
      map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (feature.get('filename')) {
            resultfeature = feature;
            return true; // feature found
        } else {
            return false; // try next feature
        }
      });
      return resultfeature;
    }

    var photopopupIsOpening = false;

    function hideInfoWindow()
    {
      // ignore if fullscreenphotoframe on top
      var camera = document.querySelector("#camerabackground");
      var fullscreenphotoframe = document.querySelector('#fullscreenphotoframe');
      if (fullscreenphotoframe.classList.contains('hidden') && !camera.classList.contains('visible')) {
        document.removeEventListener('backbutton', hideInfoWindow, false);
        activeFeature = null;
        info.classList.add('hidden');
      }
    }

    var displayFeatureInfo = function (feature, userLocation) {
      if (feature) {
        var geometry = feature.getGeometry();
        var coordinate = geometry.getCoordinates();
        var pixel = map.getPixelFromCoordinate(coordinate);

        info.style.left = pixel[0] + 'px';
        info.style.top = (pixel[1] - 15) + 'px';

        info.classList.add('hidden');

        // calculate distance between user and feature
        var distance = 1000; // initialize at 1000 km
        if (userLocation) {
          distance = calculateDistance(ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326'), ol.proj.transform(userLocation, 'EPSG:3857', 'EPSG:4326'));
        }

        var picture_url = server + '/uploads/'+feature.get('filename');
        var picture_width = feature.get('width');
        var picture_height = feature.get('height');
        var aspectratio = 1.0;
        if (picture_height && picture_width) {
          aspectratio = picture_width / picture_height;
        }
        if (aspectratio >= 1) {
          // landscape
          info.style.width = Math.floor(200 * aspectratio) + "px";
          info.style.height = "200px";
        } else {
          // portrait
          info.style.width = "200px";
          info.style.height = Math.floor(200 / aspectratio) + "px";
        }

        if (distance < 0.08) {
          var cambutton = '<span id="info-camerabutton" class="button active" title="camera"><svg class="icon"><use xlink:href="#add-a-photo" /></svg></span>';
          info.innerHTML = '<img width="100%" src="' + picture_url +'">' + cambutton;
          document.getElementById("info-camerabutton").addEventListener('click', function(event) {
            event.stopPropagation(); // do not click on photopopup
            ensureDeviceRegistration(function(result){
              if (result) {
                  // set overlay picture
                  if (picture_url.substr(-4, 4) == ".gif") {
                    // overlay_pictue: replace animated picture with first picture
                    overlaypicture_url = picture_url.substr(0, picture_url.length -4) + ".jpg"
                  } else {
                    overlaypicture_url = picture_url; // set overlay picture
                  }
                  overlayPictureId = feature.get('id');
                  cameraWindow.show();
              } else {
                  // device could not be registered, offline? no localStorage?
                  displayError("device registration failed, try again later");
              }
            });
          });
        } else {
          info.innerHTML = '<img width="100%" src="' + picture_url +'">';
        }
        photopopupIsOpening = true;
        setTimeout(function() { photopopupIsOpening = false}, 500);
        info.classList.remove('hidden');
        document.addEventListener('backbutton', hideInfoWindow, false);
      } else {
        hideInfoWindow();
      }
    };

    function hideFullscreenPhotoFrame()
    {
      var fullscreenphotoframe = document.querySelector("#fullscreenphotoframe");
      fullscreenphotoframe.classList.add("hidden");
      document.removeEventListener("backbutton", hideFullscreenPhotoFrame, false);
    }

    info.addEventListener("click", function () {
      if (photopopupIsOpening) {
        return;
      }
      var fullscreenphotoframe = document.querySelector("#fullscreenphotoframe");
      var fullscreenphoto = document.querySelector("#fullscreenphoto");
      var popupphoto = document.querySelector("#photopopup img");
      fullscreenphoto.src = popupphoto.src;
      fullscreenphotoframe.classList.remove("hidden");
      document.addEventListener("backbutton", hideFullscreenPhotoFrame, false);
    });

    var fullscreenphotoframe = document.querySelector("#fullscreenphotoframe");
    fullscreenphotoframe.addEventListener("click", function() {
      hideFullscreenPhotoFrame();
    });

    map.on('click', function(evt) {
      if (evt.dragging) {
          info.classList.add('hidden');
          return;
        }
        activeFeature = getFeatureFromPixel(map.getEventPixel(evt.originalEvent));
        displayFeatureInfo(activeFeature, geolocation.getPosition());
    });

    var dragStart = false;
    var dragPrevPixel = null;
    map.on('pointerdrag', function (event) {
      if (!dragStart) {
        // console.log('dragstart');
        dragStart = true;
      } else {
        // drag info window along
        var rect = info.getBoundingClientRect();
        info.style.left = (rect.left - (dragPrevPixel[0] - event.pixel[0])) + 'px';
        info.style.top = (rect.top - (dragPrevPixel[1] - event.pixel[1])) + 'px';
      }
      dragPrevPixel = event.pixel;
      // console.log ('dragging');
    })

    map.on('moveend', function (event) {
      if (dragStart) {
        dragStart = false;
      }
      displayFeatureInfo(activeFeature, geolocation.getPosition());
    })

    // geolocation
    geolocation = new ol.Geolocation({
        projection: map.getView().getProjection(),
        tracking: true,
        trackingOptions: {
            enableHighAccuracy: true
        }
    });

    /*
    var updateposition = function () {
      var location = geolocation.getPosition();
      location = ol.proj.transform(location, 'EPSG:3857', 'EPSG:4326');
      var accuracy = geolocation.getAccuracy();
      var xhr = new XMLHttpRequest();
      xhr.open("GET", server + "/photoserver/logposition?latitude="+location[0] + "&longitude=" + location[1] + "&accuracy="+accuracy, true);
      xhr.send();
      setTimeout (updateposition, 30000);
    }
    setTimeout (updateposition, 30000); */

    var accuracyFeature = new ol.Feature();
    geolocation.on('change:accuracyGeometry', function() {
        accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    });

    var positionFeature = new ol.Feature();
    positionFeature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2
            })
        })
    }));



    var mylocationbutton = document.querySelector("#my-locationbutton");
    mylocationbutton.addEventListener('click', function() {
        this.classList.toggle('active');
        if (this.classList.contains('active')) {
            isManualMove = false;
            var location = geolocation.getPosition();
            if ((typeof location !== 'undefined') && location) {
              map.getView().setCenter(location);
            }
            geolocation.setTrackingOptions({
                enableHighAccuracy: true
            });
            setTimeout(function() {
                isManualMove = true
            }, 300);
        } else {
            geolocation.setTracking(false);
            geolocation.setTrackingOptions({
                enableHighAccuracy: false
            });
            geolocation.setTracking(true);
        }
    });

    var isManualMove = false;
    geolocation.on('change:position', function() {
        var coordinates = geolocation.getPosition();
        positionFeature.setGeometry(coordinates ?
            new ol.geom.Point(coordinates) : null);
        if (coordinates && mylocationbutton.classList.contains('active')) {
            isManualMove = false;
            map.getView().setCenter(coordinates);
            setTimeout(function() {
                isManualMove = true
            }, 300);
        }
    });


    map.on('pointerdown', function() { // 'moveend'
        if (isManualMove) {
            mylocationbutton.classList.remove('active');
        }
    })
    // handle geolocation error.
    geolocation.on('error', function(error) {
        mylocationbutton.classList.remove('active');
        var info = document.getElementById('infobox');
        info.innerHTML = error.message;
        info.style.display = '';
    });


    new ol.layer.Vector({
        map: map,
        source: new ol.source.Vector({
            features: [accuracyFeature, positionFeature]
        })
    });
    geolocation.setTracking(true);

    var camerabutton = document.querySelector("#camera-altbutton");

    camerabutton.addEventListener('click', function() {
      ensureDeviceRegistration(function(result){
          if (result) {
            overlaypicture_url = null; // new picture, so no overlay
            overlayPictureId = 0;
            cameraWindow.show();
          } else {
            displayError("device registration failed, try again later");
          }
      })
    });

    var layersbutton = document.querySelector('#layersbutton');
    layersbutton.addEventListener('click', function() {
      layerSelector.toggle();
    });

    var layermenulines = document.querySelectorAll('#layerchooser li');
    [].forEach.call(layermenulines, function(element, index, elements) {
      if (index > 0) {
        element.addEventListener('click', function() {
          [].forEach.call(elements, function(element){
            element.classList.remove("list-group-item-warning");
          });
          element.classList.add("list-group-item-warning");
          updateLayers(map, element.getAttribute("layer"));
          });
      }
    });

    var menubutton = document.querySelector('#menubutton');
    menubutton.addEventListener('click', function() {
        popupMenu.toggle();
    });
    var menulines = document.querySelectorAll('#popupmenu li');
    [].forEach.call(menulines, function(element){
      var ref = element.getAttribute('ref');
      if (ref) {
        element.addEventListener('click', function() {
          window.location = ref + ".html";
        });
      }
    });

} // setup()

function updateLayers(map, layername)
{
  var legendvertical = document.querySelector("#legendvertical");
  var legendhorizontal = document.querySelector("#legendhorizontal");
  var legendmin = document.querySelectorAll(".legendmin");
  var legendmax = document.querySelectorAll(".legendmax");
  legendvertical.classList.add("hidden");
  legendhorizontal.classList.add("hidden");
  [].forEach.call(legendmin, function (element) {element.innerHTML = "";});
  [].forEach.call(legendmax, function (element) {element.innerHTML = "";});
  var layers = map.getLayers();
  if (layers.getLength() > 2) {
    layers.removeAt(1);
  }
  var orientation = "h";
  if (window.innerWidth < window.innerHeight) {
    orientation = "v";
  }

  // prepare and show legend
  if (layername != "") {
    var image = document.querySelector("#legendimagev");
    image.src = layername + "v.png";
    image = document.querySelector("#legendimageh")
    image.src = layername + "h.png";
    if (orientation == 'v') {
      var legendtop = document.querySelector(".legendtop");
      var legendbottom = document.querySelector(".legendbottom");
      if (layername == "startofseason") {
        legendtop.classList.add("legendtoprotated");
        legendbottom.classList.add("legendbottomrotated");
      } else {
        legendtop.classList.remove("legendtoprotated");
        legendbottom.classList.remove("legendbottomrotated");
      }
      legendvertical.classList.remove("hidden");
    } else {
      legendhorizontal.classList.remove("hidden");
    }
    if (layername == 'vegetationtrend') {
      [].forEach.call(legendmin, function(element){element.innerHTML="-0.3"});
      [].forEach.call(legendmax, function(element){element.innerHTML="+0.3"});
    } else if (layername == 'startofseason') {
      [].forEach.call(legendmin, function(element){element.innerHTML="January"});
      [].forEach.call(legendmax, function(element){element.innerHTML="December"});
    }
  }


  // add layer
  switch(layername) {
    case 'startofseason':
    case 'vegetationtrend':
        var seasonlayer = new ol.layer.Tile({
          source: new ol.source.XYZ({
            url: "http://saturnus.geodan.nl/mapproxy/myseasons/tiles/"+layername+"/EPSG900913/{z}/{x}/{y}.png?origin=nw"
          })
        })
        layers.insertAt(1, seasonlayer);
        break;
    case 'temperature':
        var yd = new Date();
        yd.setDate(yd.getDate() - 1);
        var yesterdayString = yd.getFullYear() + '-' + ('0'+(yd.getMonth() + 1)).substr(-2) + '-' + ('0'+yd.getDate()).substr(-2);
        var temperatureLayer = new ol.layer.Tile ({
          source: new ol.source.XYZ({
              //url: "//map1{a-c}.vis.earthdata.nasa.gov/wmts-webmerc/" +
              url: "http://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
                  "MODIS_Aqua_Land_Surface_Temp_Day/default/"+yesterdayString+"/" +
                  "GoogleMapsCompatible_Level7/{z}/{y}/{x}.png",
              maxZoom: 7
          })
        });
        layers.insertAt(1, temperatureLayer);
        break;
  }
}

// always display legend on longest side of screen
window.addEventListener("orientationchange", function() {
  var legendvertical = document.querySelector("#legendvertical");
  var legendhorizontal = document.querySelector("#legendhorizontal");
  if (!legendvertical.classList.contains("hidden")) {
    legendvertical.classList.add("hidden");
    legendhorizontal.classList.remove("hidden");
  } else if (!legendhorizontal.classList.contains("hidden")) {
    legendhorizontal.classList.add("hidden");
    legendvertical.classList.remove("hidden");
  }
});

// get all my photos and call callback(err, photoarray)
function getMyPhotos(callback) {
  var xhr = new XMLHttpRequest();
  var formData = "username=" + localStorage.email +  "&hash=" + localStorage.hash + "&deviceid=" + localStorage.deviceid + "&devicehash=" + localStorage.devicehash;
  xhr.open("POST", server+"/photoserver/getmyphotos");
  xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
  xhr.onreadystatechange = function (event) {
     if (xhr.readyState === 4) {
         if (xhr.status === 200) {
           callback (null, xhr.responseText);
         } else {
            callback("Error", xhr.statusText);
         }
     }
  };
  xhr.send(formData);
}

function deletePhoto(photo, callback) {
  var xhr = new XMLHttpRequest();
  var formData = "username=" + localStorage.email +  "&hash=" + localStorage.hash + "&filename=" + photo.filename + "&deviceid=" + localStorage.deviceid + "&devicehash=" + localStorage.devicehash;
  xhr.open("POST", server+"/photoserver/deletemyphoto");
  xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
  xhr.onreadystatechange = function (event) {
     if (xhr.readyState === 4) {
         if (xhr.status === 200) {
           callback (null, xhr.responseText);
         } else {
            callback("Error", xhr.statusText);
         }
     }
  };
  xhr.send(formData);
}

function rotateMyPhoto(photo, degrees, callback) {
  var xhr = new XMLHttpRequest();
  var formData = "degrees=" + degrees + "&username=" + localStorage.email +  "&hash=" + localStorage.hash + "&filename=" + photo.filename + "&deviceid=" + localStorage.deviceid + "&devicehash=" + localStorage.devicehash;
  xhr.open("POST", server+"/photoserver/rotatemyphoto");
  xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
  xhr.onreadystatechange = function (event) {
     if (xhr.readyState === 4) {
         if (xhr.status === 200) {
           callback (null, xhr.responseText);
         } else {
            callback("Error", xhr.statusText);
         }
     }
  };
  xhr.send(formData);
}
