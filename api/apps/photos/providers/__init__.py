# api/apps/photos/providers/gdrive.py
import os
from django.conf import settings
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from io import BytesIO

class GoogleDriveProvider:
    def __init__(self):
        # Buscamos el archivo JSON en la raíz de api/ (BASE_DIR)
        creds_path = settings.BASE_DIR / settings.GOOGLE_CREDENTIALS_FILE
        
        if not creds_path.exists():
            raise FileNotFoundError(f"No encuentro el archivo de credenciales en: {creds_path}")

        self.credentials = service_account.Credentials.from_service_account_file(
            creds_path,
            scopes=['https://www.googleapis.com/auth/drive.file']
        )
        self.service = build('drive', 'v3', credentials=self.credentials)
        self.folder_id = settings.GOOGLE_DRIVE_FOLDER_ID

    def upload_file(self, file_obj, filename, content_type):
        """
        Sube un archivo en memoria directamente a Drive.
        Retorna el ID del archivo en Drive.
        """
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