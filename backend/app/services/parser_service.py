import os
import pdfplumber
import docx
from fastapi import HTTPException, status
from pdf2image import convert_from_path
import pytesseract

# Set default Windows path for Tesseract if it exists in the default location
tesseract_default_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_default_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_default_path

def extract_text_from_pdf(file_path: str) -> str:
    try:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        # Fallback to OCR if no text layer was found
        if not text.strip():
            images = convert_from_path(file_path)
            ocr_text = ""
            for image in images:
                ocr_text += pytesseract.image_to_string(image) + "\n"
            text = ocr_text

        if not text.strip():
            raise ValueError("PDF is empty or has no extractable text, even after OCR.")
        return text.strip()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Corrupted or unreadable PDF: {str(e)}"
        )

def extract_text_from_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        full_text = "\n".join(text).strip()
        if not full_text:
            raise ValueError("DOCX is empty.")
        return full_text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Corrupted or unreadable DOCX: {str(e)}"
        )

def extract_text(file_path: str) -> str:
    _, ext = os.path.splitext(file_path.lower())
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {ext}. Only PDF and DOCX are allowed."
        )
