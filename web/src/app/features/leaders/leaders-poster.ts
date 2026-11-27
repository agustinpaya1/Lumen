import { Component, input } from '@angular/core';

@Component({
  selector: 'app-leaders-poster',
  template: `
    <article class="poster" aria-label="Invitación al acto de clausura">
      <img src="/assets/catedra-lideres.png" width="1024" height="278"
        alt="Cátedra Líderes · Cultura Directiva y Empresarial" />
      <div class="headline">
        <p>Acto de clausura</p>
        <h1>Curso Líderes <span>2026</span></h1>
      </div>
      <div class="details">
        <time datetime="2026-12-03T17:00:00+01:00">3 de diciembre <b>17:00 h</b></time>
        <p>Paraninfo del Rectorado <b>Edificio 3A</b></p>
      </div>
      @if (showAttendance()) {
        <div class="attendance">
          <p><strong>Rogamos máxima puntualidad.</strong></p>
          <p>Plazas limitadas. Confirma tu asistencia en el cuestionario del grupo de WhatsApp.</p>
        </div>
      }
    </article>
  `,
  styleUrl: './leaders-poster.scss',
})
export class LeadersPosterComponent {
  readonly showAttendance = input(false);
}
