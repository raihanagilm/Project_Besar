import random
from datetime import datetime

def buat_id_terstruktur(awalan: str) -> str:
    """
    Menghasilkan ID unik sesuai aturan DB-05:
    Format: <prefix><YYYYMMDD><4 random digits>
    Contoh: rcn202610034821
    """
    tanggal_sekarang = datetime.now().strftime("%Y%m%d")
    digit_acak = f"{random.randint(0, 9999):04d}"
    return f"{awalan}{tanggal_sekarang}{digit_acak}"
