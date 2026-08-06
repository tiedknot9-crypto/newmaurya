import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ExternalLink, X, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

export interface PrintPreviewData {
  html: string;
  title?: string;
  autoPrint?: boolean;
}

let printListener: ((data: PrintPreviewData) => void) | null = null;

export function printHtmlWithPreview(html: string, title: string = 'Print Preview', autoPrint: boolean = true) {
  if (printListener) {
    printListener({ html, title, autoPrint });
  } else {
    // Fallback if modal isn't mounted
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  }
}

export function PrintPreviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PrintPreviewData | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    printListener = (newData: PrintPreviewData) => {
      setData(newData);
      setIsOpen(true);
    };

    return () => {
      printListener = null;
    };
  }, []);

  useEffect(() => {
    if (isOpen && data && iframeRef.current) {
      const timer = setTimeout(() => {
        try {
          const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(data.html);
            doc.close();
          }
        } catch (e) {
          console.error('Error writing iframe content:', e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data]);

  const triggerPrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (e) {
        toast.error('Unable to initiate print directly. Trying print fallback...');
        openInNewTab();
      }
    }
  };

  const openInNewTab = () => {
    if (!data?.html) return;
    try {
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (newWin) {
        newWin.focus();
      } else {
        toast.error('Popup blocked by browser. Please use the Print Document button.');
      }
    } catch (err) {
      const newWin = window.open('', '_blank');
      if (newWin) {
        newWin.document.write(data.html);
        newWin.document.close();
        newWin.focus();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900 border-slate-700 shadow-2xl">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                {data?.title || 'Document Print Preview'}
              </DialogTitle>
              <p className="text-xs text-slate-400 font-medium">
                Review document layout before printing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={triggerPrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 shadow-lg shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              Print Document
            </Button>
            <Button
              variant="outline"
              onClick={openInNewTab}
              className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 text-xs gap-1.5"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              New Tab
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg ml-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Modal Body with Iframe Preview */}
        <div className="flex-1 bg-slate-950 p-4 md:p-6 overflow-auto flex justify-center items-start">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white rounded-md shadow-2xl border border-slate-700 overflow-hidden relative">
            <iframe
              ref={iframeRef}
              srcDoc={data?.html || ''}
              title="Print Preview Frame"
              className="w-full h-[78vh] border-0 block bg-white"
            />
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <FileText className="w-4 h-4 text-blue-400" />
            Standard A4 Document Format
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-700 h-8 text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={triggerPrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
