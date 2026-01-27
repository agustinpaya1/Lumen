# api/apps/photos/api.py
from ninja import Router, File
from ninja.files import UploadedFile
from .services import PhotoService

router = Router()

@router.post("/upload")
def upload_photo(request, file: UploadedFile = File(...)):
    service_response = PhotoService.upload_photo(
        file.file,
        file.name,
        file.content_type
    )
    return service_response