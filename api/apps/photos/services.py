# api/apps/photos/services.py
from .models import Photo
from .providers.gdrive import GoogleDriveProvider

class PhotoService:
    @staticmethod
    def upload_photo(file_obj, filename, content_type):
        """
        Maneja la lógica de negocio para subir una foto:
        1. Subir a Google Drive
        2. Guardar registro en BD
        """
        # 1. Instanciar el provider
        provider = GoogleDriveProvider()
        
        # 2. Subir a Drive
        drive_id = provider.upload_file(
            file_obj, 
            filename, 
            content_type
        )
        
        # 3. Guardar referencia en nuestra DB local
        photo = Photo.objects.create(drive_file_id=drive_id)
        
        return {
            "success": True, 
            "photo_id": str(photo.id),
            "drive_id": drive_id
        }
