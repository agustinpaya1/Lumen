import os
from google_auth_oauthlib.flow import InstalledAppFlow

# Los permisos que pediremos (Solo acceso a crear archivos en Drive)
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    # 1. Comprobamos que tienes el archivo descargado de Google
    if not os.path.exists('client_secret.json'):
        print("❌ ERROR: No encuentro el archivo 'client_secret.json'.")
        print("Descárgalo de Google Cloud (OAuth Client ID) y ponlo en esta carpeta.")
        return

    # 2. Iniciamos el baile de login
    flow = InstalledAppFlow.from_client_secrets_file(
        'client_secret.json', SCOPES)
    
    print("🚀 Abriendo navegador para que te loguees...")
    # Esto abrirá tu navegador. Loguéate con tu cuenta de siempre.
    creds = flow.run_local_server(port=0)

    # 3. Guardamos el resultado en el famoso token.json
    with open('token.json', 'w') as token:
        token.write(creds.to_json())
    
    print("✅ ¡ÉXITO! Se ha creado el archivo 'token.json'.")
    print("Ya puedes borrar 'generate_token.py' si quieres, la llave maestra ya está guardada.")

if __name__ == '__main__':
    main()