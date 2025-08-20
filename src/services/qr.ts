import QRCode from 'qrcode';

export const generateQrDataUrl = async (payload: string): Promise<string> => {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M' });
};


