import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Lugar } from '../../interfaces/interfaces';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { WebsocketService } from '../../services/websocket.service';
import mapboxgl from 'mapbox-gl';

interface RespMarcadores {
   [key: string]: Lugar;
}

@Component({
   selector: 'app-mapa',
   templateUrl: './mapa.component.html',
   styleUrl: './mapa.component.css'
})
export class MapaComponent implements OnInit {

   public mapa?: mapboxgl.Map;
   public markersMapBox: { [id: string]: mapboxgl.Marker } = {};

   // lugares: Lugar[] = [];
   lugares: RespMarcadores = {};

   constructor(
      private http: HttpClient,
      private wsService: WebsocketService,
   ) { }

   ngOnInit(): void {

      this.http.get<RespMarcadores>(`${environment.srv_socket}/mapa`).subscribe((lugares) => {
         // console.log(lugares);
         this.lugares = lugares;

         this.crearMapa();
      });

      this.escucharSockets();
   }

   escucharSockets() {

      //marcador-nuevo
      this.wsService.listen('marcador-nuevo').subscribe((marcador: Lugar) => {
         this.agregarMarcador(marcador);
      });

      //marcador-mover
      this.wsService.listen('marcador-mover').subscribe( (marcador: Lugar) => {
         // console.log({marcador});
         this.markersMapBox[ marcador.id ].setLngLat([ marcador.lng, marcador.lat]);
      });

      //marcador-borrar
      this.wsService.listen('marcador-borrar').subscribe((id: string) => {
         this.markersMapBox[id].remove();
         delete this.markersMapBox[id];
      });

   }

   crearMapa() {
      mapboxgl.accessToken = 'pk.eyJ1IjoiaXNhYWN6am8iLCJhIjoiY2x4aXFiMGg1MXNwZzJrcHJtbTBrOG13dCJ9.GOSnQUozYMIxqQXSC1PR1w';

      this.mapa = new mapboxgl.Map({
         container: 'mapa', // container ID
         style: 'mapbox://styles/mapbox/streets-v12', // style URL
         center: [-75.75512993582937, 45.349977429009954], // starting position [lng, lat]
         zoom: 15.8, // starting zoom
      });

      // const map = new Map({
      //    container: this.divMap?.nativeElement,
      //    style: 'mapbox://styles/mapbox/streets-v12', // style URL
      //    center: [-75.75512993582937 , 45.349977429009954], // starting position [lng, lat]
      //    zoom: 15.8, // starting zoom
      // });

      //destructuracion de arreglos
      for (const [id, marcador] of Object.entries(this.lugares)) {
         // console.log(id, marcador);
         this.agregarMarcador(marcador);
      }
   }

   public agregarMarcador(marcador: Lugar) {
      // console.log(marcador);

      const h2 = document.createElement('h2');
      h2.innerText = marcador.nombre;

      const btnBorrar = document.createElement('button');
      btnBorrar.innerText = 'Borrar';
      btnBorrar.className = 'btn btn-secondary';
      // btnBorrar.onclick = borrarMarcador();

      const div = document.createElement('div');
      div.append(h2, btnBorrar);

      // const html = `<h2>${marcador.nombre}</h2>
      //               <br>
      //               <button class='btn btn-secondary'>Borrar</button>`;

      const customPopup = new mapboxgl.Popup({
         offset: 25,
         closeOnClick: false,
      }).setDOMContent(div);

      const marker = new mapboxgl.Marker({
         draggable: true,
         color: marcador.color,
      })
         .setLngLat([marcador.lng, marcador.lat])
         .setPopup(customPopup)
         .addTo(this.mapa!);

      marker.on('drag', () => {
         //nuevas coordenadas
         const lngLat = marker.getLngLat();
         //todos los datos son los mismos, excepto las coordenadas.
         const nuevoMarcador = {...marcador, lng: lngLat.lng, lat: lngLat.lat};
         // console.log({nuevoMarcador});

         //TODO: Crear evento para emitir las coordenadas del marcador.
         this.wsService.emit('marcador-mover', nuevoMarcador);

      });

      btnBorrar.addEventListener('click', () => {
         marker.remove();

         //TODO: Eliminar el marcador mediante sockets.
         this.wsService.emit('marcador-borrar', marcador.id);
      })

      this.markersMapBox[marcador.id] = marker;
      // console.log(this.markersMapBox);
   }

   public onCrearMarcador() {

      const customMarker: Lugar = {
         id: new Date().toISOString(),
         nombre: 'Sin Nombre',
         lng: -75.75512993582937,
         lat: 45.349977429009954,
         color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      }

      this.agregarMarcador(customMarker);

      // emitir marcador-nuevo
      this.wsService.emit('marcador-nuevo', customMarker);
   }

}
