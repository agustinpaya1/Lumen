# api/apps/photos/api.py
from ninja import Router, File
from ninja.files import UploadedFile
from .models import Photo
from .providers.gdrive import GoogleDriveProvider

router = Router()

@router.post("/upload")
def upload_photo(request, file: UploadedFile = File(...)):
    # 1. Instanciar el provider (Conecta con Google)
    provider = GoogleDriveProvider()
    
    # 2. Subir a Drive (La magia ocurre aquí)
    # file.file es el objeto en memoria (BytesIO)
    drive_id = provider.upload_file(
        file.file, 
        file.name, 
        file.content_type
    )
    
    # 3. Guardar referencia en nuestra DB local
    photo = Photo.objects.create(drive_file_id=drive_id)
    
    return {
        "success": True, 
        "photo_id": str(photo.id),
        "drive_id": drive_id
    }