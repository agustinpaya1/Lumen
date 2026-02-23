import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (isInAppBrowser) {
      <div style="position: fixed; top: 0; left: 0; right: 0; background: #ffcc00; color: #000; padding: 15px; font-weight: bold; text-align: center; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Para usar la cámara y ver las fotos correctamente, abre este enlace en Safari o Chrome (pulsa los 3 puntos arriba a la derecha).
      </div>
    }
    <!-- Aquí se pintará la cámara -->
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  isInAppBrowser = false;

  ngOnInit() {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (ua.includes('WhatsApp') || ua.includes('Instagram') || ua.includes('FBAN') || ua.includes('FBAV')) {
      this.isInAppBrowser = true;
    }
  }
}