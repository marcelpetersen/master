import {Component, ViewChild, AfterViewInit, NgZone} from '@angular/core';
import {registerElement} from 'nativescript-angular/element-registry';
import { Router } from "@angular/router";
import {RouterExtensions} from 'nativescript-angular/router/router-extensions';
//import {Observable} from 'rxjs/Observable';
import {Observable, EventData} from "data/observable";
import {ObservableArray} from "data/observable-array";
var imageSource = require('tns-core-modules/image-source/image-source');

import geolocation = require('nativescript-geolocation');
//import { Location, enableLocationRequest, watchLocation, clearWatch } from "nativescript-geolocation";

import {MapView, Marker, Polyline, Position} from 'nativescript-google-maps-sdk';

import {Page} from "ui/page";
import {RadSideDrawer} from 'nativescript-telerik-ui/sidedrawer';
import sideDrawerModule = require('nativescript-telerik-ui/sidedrawer');
import {RadSideDrawerComponent, SideDrawerType} from 'nativescript-telerik-ui/sidedrawer/angular';
import {Config} from "../../shared/config";
import {BackendService, FirebaseService} from "../../services";
import { TNSFontIconService } from 'nativescript-ngx-fonticon';

import { alert } from "../../shared";
import { setInterval, setTimeout, clearInterval } from "timer";

import {Color} from 'color';

import { FlexboxLayout, FlexDirection, FlexWrap, JustifyContent, AlignItems, AlignContent, AlignSelf} from "ui/layouts/flexbox-layout";

var style = require("./mapstyle.json");

registerElement('MapView', () => MapView);
registerElement("Fab", () => require("nativescript-floatingactionbutton").Fab);

let vm;
@Component({
    moduleId: module.id,
    selector: 'gf-map',
    templateUrl: 'map.component.html',
    styleUrls: ['map.component.css'],
})

export class MapComponent implements AfterViewInit {
    mapView:any = null;
    watchId:number = null;
    gpsLine:Polyline;
    tapLine:Polyline;
    tapMarker:any;
    gpsMarker:any;
    centeredOnLocation:boolean = false;

    //public message$: Observable<any>;
    public isMonitoring = false;
    public monitorSpeed: string = "0";
    public distance:number = 0;
    public lastLocation:any;
    private _locations: ObservableArray<geolocation.Location>;

    public get locations(): ObservableArray<geolocation.Location> {
        if (!this._locations) {
            this._locations = new ObservableArray<geolocation.Location>();
        }
        return this._locations;
    }

    constructor(private router: Router,
      private page: Page,
      private fonticon: TNSFontIconService,
      private routerExtensions: RouterExtensions,
      private firebaseService: FirebaseService)
      {vm = this;}

    ngOnInit() {
      //this.message$ = <any>this.firebaseService.getMyMessage();
      this.page.actionBarHidden = true;
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
            return geolocation.enableLocationRequest();
        } else {
            return Promise.resolve(true);
        }
    }

    getLocation() {
        if (geolocation.isEnabled()) {
            var location = geolocation.getCurrentLocation({
                timeout: 500,
                desiredAccuracy: 7,
                updateDistance: 20,
                minimumUpdateTime: 1000,
                maximumAge: 20000
            })
            return location;
        }
        return Promise.reject('GPS no habilitado.');
    }

    onMapReady(event) {
        console.log('Map Ready');
        if (vm.mapView || !event.object) return;

        vm.mapView = event.object;

        vm.mapView.markerSelect = vm.onMarkerSelect;
        vm.mapView.cameraChanged = vm.onCameraChanged;
        vm.mapView.setStyle( style );
        vm.enableLocation()
        .then(() => {
                vm.watchId = geolocation.watchLocation(vm.locationNow, vm.error, {
                    desiredAccuracy: 7,
                    updateDistance: 5,
                    minimumUpdateTime: 2000,
                    maximumAge: 200
                });
            }, vm.error);
    };

    startMonitor() {
      console.log('Monitoring trip');
      vm.enableLocation()
          .then(vm.getLocation)
          .then(() => {
              //vm.watchId = geolocation.watchLocation((locationReceived) => {
                    //vm.updateDistance(locationReceived);
                    //vm.distance = vm.distance + geolocation.distance(locationReceived, vm.lastLocation);
                    //vm.lastLocation = locationReceived;
                    //vm._page.getViewById("distanceLabel").android.setText(vm.getDistanceFormatted());
                    //console.log("distancia recorrida:" + vm.distance);
                //},
                //function(e){
                //    console.log("Error: " + e.message);
                //},
                //{ desiredAccuracy: 7, updateDistance: 1, minimumUpdateTime: 1000 })
              vm.watchId = geolocation.watchLocation(vm.locationReceived, vm.error, {
                  desiredAccuracy: 7,
                  updateDistance: 5,
                  minimumUpdateTime: 2000,
                  maximumAge: 200
              });
          }, vm.error);
  }


    stopMonitor() {
      console.log('Stop monitoring trip');
      if (vm.watchId) {
        geolocation.clearWatch(vm.watchId);
        vm.removeLine(vm.gpsLine);
        vm.gpsLine = null;
    }
    }

    locationReceived(position:Position) {
        console.log('GPS Update Received: ' + position.latitude , position.longitude);

        if (vm.mapView && position && !vm.centeredOnLocation) {
            vm.mapView.latitude = position.latitude;
            vm.mapView.longitude = position.longitude;
            vm.mapView.zoom = 16;
            vm.centeredOnLocation = true;
        }

        vm.gpsLine = vm.addPointToLine({
            color: new Color('LightGreen'),
            line: vm.gpsLine,
            location: position,
            geodesic: true,
            width: 12
        });
        vm.mapView.cameraChanged = vm.onCameraChanged;
        this.lastLocation = position.latitude;
        vm.removeMarker(vm.gpsMarker);
        vm.gpsMarker = vm.addMarker({
            location: position,
            title: 'Mi ubicación',
        });
    };

    locationNow(position:Position) {
        console.log("GPS Update Received" + position.latitude, position.longitude);

        if (vm.mapView && position && !vm.centeredOnLocation) {
            vm.mapView.latitude = position.latitude;
            vm.mapView.longitude = position.longitude;
            vm.mapView.zoom = 16;
            vm.centeredOnLocation = true;
        }

        vm.removeMarker(vm.gpsMarker);
        vm.gpsMarker = vm.addMarker({
            location: position,
            title: 'Mi ubicación',
        });
    };

    addPointToLine(args:AddLineArgs) {
        if (!vm.mapView || !args || !args.location) return;

        let line = args.line;

        if (!line) {
            line = new Polyline();
            line.visible = true;
            line.width = args.width || 10;
            line.color = args.color || new Color('LightRed');
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
        //marker.icon = args.icon;

        vm.mapView.addMarker(marker);

        return marker;
    };

    clearGpsLine() {
        vm.removeLine(vm.gpsLine);
        vm.gpsLine = null;
        vm.closeDrawer();
    };

    removeLine(line:Polyline) {
        if (line) {
            line.removeAllPoints();
        }
    }

    removeMarker(marker:Marker) {
        if (this.mapView && marker) {
            this.mapView.removeMarker(marker);
        }
    }

    updateDistance(locationReceived) {
      vm.distance = vm.distance + geolocation.distance(vm.lastLocation, vm.locationReceived);
      vm.lastLocation = vm.locationReceived;
      //vm._page.getViewById("distanceLabel").android.setText(vm.getDistanceFormatted());
      console.log("distancia recorrida:" + vm.distance);
    }

    toggleButton() {
      this.isMonitoring = !this.isMonitoring;
      if (this.isMonitoring) {
              this.startMonitor();
          } else {
              this.stopMonitor();
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
        vm.centeredOnLocation = true;
    }

    logoff() {
      this.firebaseService.logout();
      this.routerExtensions.navigate(["/login"], { clearHistory: true } );
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
    public icon:any;
}
