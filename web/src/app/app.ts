import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// 1. AJUSTE: Importamos desde 'supabase' (sin .service)
import { SupabaseService } from './core/services/supabase';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // 2. AJUSTE: Apuntamos a tus archivos reales (app.html y app.scss)
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  // Inyectamos el servicio
  private supabase = inject(SupabaseService);
  title = signal('Lumen');

  async ngOnInit() {
    console.log('⚡ INICIO: Intentando conectar con Supabase...');

    // Creamos un archivo falso
    const dummyFile = new File(['(contenido fake)'], 'test-angular.txt', { type: 'text/plain' });

    try {
      console.log('📤 Subiendo archivo...');
      const { data, error } = await this.supabase.uploadPhoto(dummyFile, 'prueba-conexion.txt');

      if (error) {
        console.error('❌ Error devuelto por Supabase:', error);
        throw error;
      }

      console.log('✅ ¡ÉXITO TOTAL! Archivo subido:', data);
    } catch (err) {
      console.error('❌ Error general en la subida:', err);
    }
  }
}