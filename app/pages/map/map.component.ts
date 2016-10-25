import {Component, ViewChild, AfterViewInit} from '@angular/core';
import {registerElement} from 'nativescript-angular/element-registry';
let geolocation = require('nativescript-geolocation');
import {MapView, Marker, Polyline, Position} from 'nativescript-google-maps-sdk';
import sideDrawerModule = require('nativescript-telerik-ui/sidedrawer');
import {RadSideDrawerComponent, SideDrawerType} from 'nativescript-telerik-ui/sidedrawer/angular';

import {Color} from 'color';

console.log('Registering MapView');
registerElement('MapView', () => MapView);

let vm;
@Component({
    moduleId: module.id,
    selector: 'map',
    templateUrl: 'map.html',
    styleUrls: ['map.css'],
})
export class MapComponent implements AfterViewInit {
    mapView:any = null;
    watchId:number = null;
    gpsLine:Polyline;
    tapLine:Polyline;
    tapMarker:any;
    gpsMarker:any;
    centeredOnLocation:boolean = false;

    constructor() {
        vm = this;
    }

    @ViewChild(RadSideDrawerComponent) public drawerComponent: RadSideDrawerComponent;
    private drawer: SideDrawerType;

    ngAfterViewInit() {
       vm.drawer = vm.drawerComponent.sideDrawer;
    }

    openDrawer(){
        vm.drawer.showDrawer();
    }

    closeDrawer(){
        vm.drawer.closeDrawer();
    }

    enableLocation() {
        if (!geolocation.isEnabled()) {
            console.log('Location not enabled, requesting.');
            return geolocation.enableLocationRequest();
        } else {
            return Promise.resolve(true);
        }
    }

    getLocation() {
        if (geolocation.isEnabled()) {
            return geolocation.getCurrentLocation({
                desiredAccuracy: 10,
                updateDistance: 10,
                minimumUpdateTime: 1000,
                maximumAge: 10000
            })
        }
        return Promise.reject('Geolocation not enabled.');
    }

    //Map events
    onMapReady(event) {
        console.log('Map Ready');
        if (vm.mapView || !event.object) return;

        vm.mapView = event.object;

        vm.mapView.markerSelect = vm.onMarkerSelect;
        vm.mapView.cameraChanged = vm.onCameraChanged;

        vm.enableLocation()
            .then(vm.getLocation)
            .then(vm.locationReceived)
    };

    //Botón iniciar viaje
    buttonStartTap(event) {
      console.log('Iniciar viaje');
      if (vm.mapView || !event.object) return;
      vm.mapView = event.object;

      vm.mapView.markerSelect = vm.onMarkerSelect;
      vm.mapView.cameraChanged = vm.onCameraChanged;

      vm.enableLocation()
      .then(vm.getLocation)
      .then(() => {
          vm.watchId = geolocation.watchLocation(vm.locationReceived, vm.error, {
              desiredAccuracy: 10,
              updateDistance: 10,
              minimumUpdateTime: 10000,
              maximumAge: 60000
          });
      }, vm.error);
    }
    //Botón detener viaje
    buttonStopTap(event) {
      console.log('Detener viaje');
      if (vm.watchId) {
          geolocation.clearWatch(vm.watchId);
          console.log('Viaje terminado')
      }
    }

    mapTapped(event) {
        console.log('Map Tapped');

        vm.tapLine = vm.addPointToLine({
            color: new Color('Red'),
            line: vm.tapLine,
            location: event.position,
            geodesic: true,
            width: 10
        });

        vm.removeMarker(vm.tapMarker);
        vm.tapMarker = vm.addMarker({
            location: event.position,
            title: 'Tap Location'
        });
    };

    locationReceived(position:Position) {
        console.log('GPS Update Received');

        if (vm.mapView && position && !vm.centeredOnLocation) {
            vm.mapView.latitude = position.latitude;
            vm.mapView.longitude = position.longitude;
            vm.mapView.zoom = 16;
            vm.centeredOnLocation = true;
        }

        vm.gpsLine = vm.addPointToLine({
            color: new Color('Green'),
            line: vm.gpsLine,
            location: position,
            geodesic: true,
            width: 10
        });

        vm.removeMarker(vm.gpsMarker);
        vm.gpsMarker = vm.addMarker({
            location: position,
            title: 'GPS Location'
        });
    };

    addPointToLine(args:AddLineArgs) {
        if (!vm.mapView || !args || !args.location) return;

        let line = args.line;

        if (!line) {
            line = new Polyline();
            line.visible = true;
            line.width = args.width || 10;
            line.color = args.color || new Color('Red');
            line.geodesic = args.geodesic != undefined ? args.geodesic : true;
            vm.mapView.addPolyline(line);
        }
        line.addPoint(Position.positionFromLatLng(args.location.latitude, args.location.longitude));

        return line;
    }

    addMarker(args:AddMarkerArgs) {
        if (!vm.mapView || !args || !args.location) return;

        let marker = new Marker();
        marker.position = Position.positionFromLatLng(args.location.latitude, args.location.longitude);
        marker.title = args.title;
        marker.snippet = args.title;
        vm.mapView.addMarker(marker);

        return marker;
    };

    clearGpsLine() {
        vm.removeLine(vm.gpsLine);
        vm.gpsLine = null;
        vm.closeDrawer();
    };

    clearTapLine() {
        vm.removeLine(vm.tapLine);
        vm.tapLine = null;
        vm.removeMarker(vm.tapMarker);
        vm.tapMarker = null;
        vm.closeDrawer();
    }

    removeLine(line:Polyline) {
        if (line) {
            line.removeAllPoints();
        }
    }

    removeMarker(marker:Marker) {
        if (vm.mapView && marker) {
            vm.mapView.removeMarker(marker);
        }
    }

    error(err) {
        console.log('Error: ' + JSON.stringify(err));
    }

    onMarkerSelect(event) {
        console.log('Clicked on ' + event.marker.title);
    }

    onCameraChanged(event) {
        console.log('Camera changed: ' + JSON.stringify(event.camera));
    }
}

export class AddLineArgs {
    public color:Color;
    public line:Polyline;
    public location:Position;
    public geodesic:boolean;
    public width:number;
}

export class AddMarkerArgs {
    public location:Position;
    public title:string;
}
