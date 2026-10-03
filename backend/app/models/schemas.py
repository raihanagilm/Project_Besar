from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class RencanaBuatDTO(BaseModel):
    judul: str = Field(..., min_length=2, max_length=150)
    deskripsi: Optional[str] = None

class ChatInputDTO(BaseModel):
    rencana_id: str = Field(..., description="ID Rencana/Proyek aktif")
    pesan: str = Field(..., min_length=2)
    mode: Optional[str] = Field("fast", description="'fast' (langsung diagram) atau 'thinking' (analisa & rekomendasi opsi)")

class EditChatDTO(BaseModel):
    sesi_id: str
    rencana_id: str
    pesan_baru: str = Field(..., min_length=2)
    mode: Optional[str] = Field("fast", description="'fast' atau 'thinking'")

class SimpanNodeDTO(BaseModel):
    rencana_id: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
