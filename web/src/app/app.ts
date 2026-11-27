import { Component, DOCUMENT, OnInit, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { EventService } from '@core/services/event.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (isInAppBrowser) {
      <div class="in-app-browser-banner" role="status">
        Para usar la cámara y ver las fotos correctamente, abre este enlace en Safari o Chrome (pulsa los 3 puntos arriba a la derecha).
      </div>
    }
    <router-outlet></router-outlet>
  `,
})
export class AppComponent implements OnInit {
  isInAppBrowser = false;
  private readonly event = inject(EventService);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      this.title.setTitle(`${this.event.name()} · Lumen`);
      const root = this.document.documentElement;
      root.classList.toggle('leaders-event', this.event.isLeaders);
      const vars = this.event.cssVariables();
      for (const [cssVar, value] of Object.entries(vars)) {
        if (value) {
          root.style.setProperty(cssVar, value);
        } else {
          root.style.removeProperty(cssVar);
        }
      }
      const themeMeta = this.document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', this.event.accentColor());
      }
    });
  }

  ngOnInit() {
    // TODO(compat): User-Agent sniffing is brittle and breaks as in-app browsers
    //               change their UA — revisit with feature detection.
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (ua.includes('WhatsApp') || ua.includes('Instagram') || ua.includes('FBAN') || ua.includes('FBAV')) {
      this.isInAppBrowser = true;
    }
  }
}