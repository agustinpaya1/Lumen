# api/apps/photos/models.py
import uuid
from django.db import models

class Photo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    drive_file_id = models.CharField(max_length=255, help_text="ID del archivo en Google Drive")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Aquí podríamos añadir campos como 'guest_name' o 'event_id' en el futuro
    
    def __str__(self):
        return f"Photo {self.id} (Drive: {self.drive_file_id})"