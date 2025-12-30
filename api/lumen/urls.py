# api/lumen/urls.py
from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI
from apps.photos.api import router as photos_router

api = NinjaAPI()
api.add_router("/photos", photos_router)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]