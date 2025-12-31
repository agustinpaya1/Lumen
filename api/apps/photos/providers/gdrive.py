# api/apps/photos/providers/gdrive.py
import os
import json
from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

class GoogleDriveProvider:
    def __init__(self):
        # 1. Buscamos el token.json que generaste con el script
        token_path = settings.BASE_DIR / 'token.json'
        
        creds = None
        
        # Modo Local: Leemos el archivo generado
        if token_path.exists():
            creds = Credentials.from_authorized_user_file(token_path, ['https://www.googleapis.com/auth/drive.file'])
        
        # Modo Producción (Vercel): Leemos de variable de entorno (lo configuraremos luego)
        elif os.getenv('GOOGLE_TOKEN_JSON'):
            token_json = os.getenv('GOOGLE_TOKEN_JSON')
            info = json.loads(token_json)
            creds = Credentials.from_authorized_user_info(info)
        
        if not creds:
             raise FileNotFoundError(f"No encuentro el archivo token.json en {token_path}. ¿Has ejecutado generate_token.py?")

        self.service = build('drive', 'v3', credentials=creds)
        
        # Asegúrate de que settings.GOOGLE_DRIVE_FOLDER_ID tiene valor
        self.folder_id = settings.GOOGLE_DRIVE_FOLDER_ID

    def upload_file(self, file_obj, filename, content_type):
        file_metadata = {
            'name': filename,
            'parents': [self.folder_id]
        }
        
        media = MediaIoBaseUpload(
            file_obj,
            mimetype=content_type,
            resumable=True
        )
        
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        return file.get('id')