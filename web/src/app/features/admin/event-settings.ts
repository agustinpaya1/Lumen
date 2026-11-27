import { EventState, EventTheme, EventThemeColors, EventThemePlace } from '@core/services/event.service';

export const themeTextFields = {
  kicker: 'Texto sobre el título de bienvenida',
  headline: 'Título de bienvenida',
  invitationTitle: 'Título de la invitación',
  eyebrow: 'Fecha y lugar en la invitación',
  subtitle: 'Subtítulo de bienvenida',
  illustrationAlt: 'Descripción de la imagen',
} satisfies Partial<Record<keyof EventTheme, string>>;

export const eventColorFields = {
  accent: 'Acento',
  accentSoft: 'Acento suave',
  accentContrast: 'Texto sobre el acento',
  primary: 'Primario',
  surface: 'Fondo',
  surfaceElevated: 'Fondo de tarjetas',
  surfaceMuted: 'Fondo secundario',
  ink: 'Texto principal',
  inkSecondary: 'Texto secundario',
  muted: 'Texto atenuado',
  border: 'Bordes',
  focus: 'Foco de teclado',
  success: 'Éxito',
  warning: 'Aviso',
  danger: 'Error',
  tvBg: 'TV · fondo',
  tvSurface: 'TV · tarjetas',
  tvText: 'TV · texto',
  tvHighlight: 'TV · acento',
} satisfies Record<keyof EventThemeColors, string>;

export type EventSettings = {
  name: string;
  event_date: string;
  banner_url: string | null;
  photo_limit: number | null;
  theme: EventTheme;
};

export function draftFromEvent(state: EventState | null): EventSettings {
  return {
    name: state?.name ?? '',
    event_date: state?.event_date ?? '',
    banner_url: state?.banner_url ?? null,
    photo_limit: state?.photo_limit ?? null,
    theme: {
      ...state?.theme,
      colors: { ...state?.theme?.colors, accent: state?.theme?.colors?.accent
        || state?.theme?.accentColor || state?.brand_color || undefined },
      places: state?.theme?.places?.map(place => ({ ...place })) ?? [],
    },
  };
}

function validUrl(value: string, allowLocal: boolean): boolean {
  if (/[\s\\]/.test(value)) return false;
  if (allowLocal && value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeSettings(draft: EventSettings, promptLines: string): EventSettings {
  const name = draft.name.trim();
  const banner = draft.banner_url?.trim() || null;
  if (!name || !draft.event_date) throw new Error('Indica el nombre y la fecha del evento.');
  if (banner && !validUrl(banner, true)) {
    throw new Error('La imagen debe usar un enlace HTTPS o una ruta del sitio que empiece por /.');
  }
  if (draft.photo_limit === null || !Number.isInteger(draft.photo_limit)
    || draft.photo_limit < 1 || draft.photo_limit > 1000) {
    throw new Error('El límite de fotos debe ser un número entero entre 1 y 1000.');
  }

  const theme = { ...draft.theme, colors: { ...draft.theme.colors } };
  for (const key of Object.keys(themeTextFields) as (keyof typeof themeTextFields)[]) {
    theme[key] = theme[key]?.trim() || undefined;
  }
  for (const key of Object.keys(eventColorFields) as (keyof EventThemeColors)[]) {
    const value = theme.colors[key]?.trim();
    if (value && !CSS.supports('color', value)) throw new Error(`Revisa el color «${eventColorFields[key]}».`);
    theme.colors[key] = value || undefined;
  }

  theme.photoPrompts = promptLines.split('\n').map(line => line.trim()).filter(Boolean);
  theme.places = (draft.theme.places ?? []).map((place): EventThemePlace => {
    const title = place.title.trim();
    const mapUrl = place.mapUrl?.trim() || undefined;
    if (!title) throw new Error('Escribe un título para cada lugar o elimina el lugar vacío.');
    if (mapUrl && !validUrl(mapUrl, false)) throw new Error(`El mapa de «${title}» debe usar HTTPS.`);
    return {
      title,
      mapUrl,
      eyebrow: place.eyebrow?.trim() || undefined,
      address: place.address?.trim() || undefined,
      linkLabel: place.linkLabel?.trim() || undefined,
    };
  });

  return { ...draft, name, banner_url: banner, theme };
}
