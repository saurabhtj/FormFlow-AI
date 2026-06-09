import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UploadCloud, FileText, ArrowRight, Loader2, CheckCircle2, DownloadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { auth } from '../firebase';

export default function DashboardPage() {
  const { logout, isAdmin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [mappings, setMappings] = useState<{fieldLabel: string, mappedValue: string, x?: number, y?: number, width?: number, height?: number}[]>([]);
  
  const [ocrProgress, setOcrProgress] = useState(0);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setMappings([]);
      setOcrProgress(0);
      if (selectedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selectedFile));
      } else if (selectedFile.type === 'application/pdf') {
        setPreview('pdf');
      }
    }
  };

  const triggerUpload = () => {
    document.getElementById('file-upload')?.click();
  };

  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    if (preview === 'pdf') {
      alert("PDF rendering is not yet supported in this preview! Please upload an image form (JPG/PNG).");
      return;
    }

    setProcessing(true);
    setOcrProgress(0);
    try {
      setStatusText('Processing form with AI Vision...');
      
      const base64Data = await fileToBase64(file);
      const mimeType = file.type;

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/fill-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ base64Data, mimeType })
      });
      
      const data = await res.json();
      if (!res.ok) {
         throw new Error(data.error || 'Failed to map fields');
      }
      
      setMappings(data.mappings);
      setStatusText('');
    } catch (error: any) {
      console.error(error);
      alert('Error during processing: ' + error.message);
      setStatusText('');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = async () => {
    if (!file || mappings.length === 0) return;
    setStatusText('Generating your filled PDF...');
    setProcessing(true);
    try {
      const { PDFDocument, rgb, StandardFonts, PageSizes } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const base64Data = await fileToBase64(file);
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      let image;
      if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      // Create a High-Definition A4 Page (Standard HD Document Quality)
      const page = pdfDoc.addPage(PageSizes.A4);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const imgDims = image.scale(1);
      // Scale image to fit the A4 page perfectly
      const scale = Math.min(pageWidth / imgDims.width, pageHeight / imgDims.height);
      const drawWidth = imgDims.width * scale;
      const drawHeight = imgDims.height * scale;
      
      const xOffset = (pageWidth - drawWidth) / 2;
      const yOffset = (pageHeight - drawHeight) / 2;

      page.drawImage(image, {
        x: xOffset,
        y: yOffset,
        width: drawWidth,
        height: drawHeight,
      });

      for (const mapping of mappings) {
        if (mapping.x !== undefined && mapping.y !== undefined) {
           const xPos = xOffset + ((mapping.x / 100) * drawWidth);
           
           // Calculate dynamic font size based on the height of the blank box.
           let fontSize = mapping.height 
             ? (mapping.height / 100) * drawHeight * 0.8 
             : Math.floor(drawHeight * 0.015);
             
           fontSize = Math.max(8, Math.min(fontSize, 30));

           // Adjust font size if text is too wide for the box
           if (mapping.width) {
             const maxWidth = (mapping.width / 100) * drawWidth;
             const textWidth = helveticaFont.widthOfTextAtSize(mapping.mappedValue, fontSize);
             if (textWidth > maxWidth && maxWidth > 0) {
               fontSize = fontSize * (maxWidth / textWidth);
             }
           }
           
           // y% refers to the TOP edge of the text box.
           // In pdf-lib, Y is bottom-up, and drawText Y is the baseline. 
           // So baseline = Top of image - (y%) - fontSize
           const yPos = yOffset + drawHeight - ((mapping.y / 100) * drawHeight) - fontSize;
           
           page.drawText(mapping.mappedValue, {
             x: xPos,
             y: yPos,
             size: fontSize,
             font: helveticaFont,
             color: rgb(0, 0, 0), // Pure black ink
           });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Filled_${file.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatusText('');
    } catch (err: any) {
       console.error(err);
       alert("Error generating PDF: " + err.message);
    } finally {
       setProcessing(false);
    }
  };

  const imageRef = useRef<HTMLImageElement>(null);
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const index = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(index) || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    
    let xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    let yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    
    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));
    
    const newMappings = [...mappings];
    newMappings[index].x = xPercent;
    newMappings[index].y = yPercent;
    setMappings(newMappings);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMappingChange = (index: number, newValue: string) => {
    const newMappings = [...mappings];
    newMappings[index].mappedValue = newValue;
    setMappings(newMappings);
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="text-indigo-500 w-8 h-8" />
              Form Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Upload any blank form to get started</p>
          </div>
          <div className="flex gap-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" className="text-red-400 hover:text-red-300">Admin</Button>
              </Link>
            )}
            <Link to="/vault">
              <Button variant="ghost">Profile Vault</Button>
            </Link>
            <Button variant="ghost" onClick={logout}>Sign out</Button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 border-dashed border-2 border-white/20 hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center min-h-[400px] md:col-span-1">
            <UploadCloud className="w-16 h-16 text-indigo-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Upload Blank Form</h2>
            <p className="text-gray-400 text-center mb-6 max-w-sm">
              Upload a PDF or Image (JPG, PNG). We will extract the fields and map them to your Vault.
            </p>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".pdf,image/*"
              onChange={handleFileChange}
            />
            <div onClick={triggerUpload}>
              <Button variant="primary" className="w-full">Select File</Button>
            </div>

            {file && mappings.length === 0 && (
              <div className="mt-8 flex flex-col w-full gap-3">
                {processing && (
                  <span className="text-indigo-400 text-sm animate-pulse flex items-center justify-center gap-2">
                    {statusText} 
                    {ocrProgress > 0 && ocrProgress < 100 && `(${ocrProgress}%)`}
                  </span>
                )}
                <Button size="lg" className="gap-2 w-full" onClick={handleUpload} disabled={processing}>
                  {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Fill with AI'}
                </Button>
              </div>
            )}
            
            {mappings.length > 0 && (
              <div className="mt-8 flex flex-col w-full gap-3">
                 <p className="text-sm text-green-400 flex items-center gap-2 mb-2">
                   <CheckCircle2 className="w-4 h-4" /> AI Mapping Complete
                 </p>
                 <p className="text-xs text-gray-400 mb-4">
                   Verify the data below. You can also drag and drop the yellow text boxes on the right to perfect the alignment before downloading!
                 </p>

                 <div className="max-h-60 overflow-y-auto pr-2 space-y-3 mb-4 custom-scrollbar">
                   {mappings.map((m, idx) => (
                     <div key={idx} className="flex flex-col gap-1 bg-white/5 p-2 rounded border border-white/10">
                       <label className="text-xs text-gray-400 font-medium">{m.fieldLabel}</label>
                       <input 
                         type="text" 
                         value={m.mappedValue}
                         onChange={(e) => handleMappingChange(idx, e.target.value)}
                         className="w-full bg-navy-800 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                       />
                     </div>
                   ))}
                 </div>

                 {processing && <span className="text-indigo-400 text-sm animate-pulse text-center">{statusText}</span>}
                <Button size="lg" className="gap-2 w-full" variant="primary" onClick={generatePDF} disabled={processing}>
                   <DownloadCloud className="w-5 h-5" /> Download PDF
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-4 flex flex-col min-h-[600px] md:col-span-2 overflow-hidden bg-white/5 border border-white/10">
            <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Visual Form Editor</h2>
            <div className="flex-1 rounded-xl flex items-center justify-center overflow-auto relative p-2">
              {!file && <p className="text-gray-500">No form selected</p>}
              {file && preview === 'pdf' && (
                <div className="text-center p-4">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300 break-all">{file.name}</p>
                </div>
              )}
              {file && preview !== 'pdf' && preview && (
                <div 
                  className="relative inline-block border border-white/10 shadow-2xl bg-white"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <img 
                    ref={imageRef} 
                    src={preview} 
                    alt="Form preview" 
                    className="max-w-full h-auto object-contain pointer-events-none" 
                    style={{ maxHeight: '700px' }}
                  />
                  {mappings.map((m, idx) => (
                    m.x !== undefined && m.y !== undefined && (
                      <div 
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        style={{ left: `${m.x}%`, top: `${m.y}%` }}
                        className="absolute cursor-move bg-yellow-200/90 text-black border border-yellow-500 px-1 py-0.5 text-xs md:text-sm font-semibold whitespace-nowrap shadow-md hover:ring-2 ring-indigo-600 transition-all z-10"
                        title={m.fieldLabel}
                      >
                        {m.mappedValue}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
