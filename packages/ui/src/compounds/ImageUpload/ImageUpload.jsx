'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';

import { Button } from '../../primitives/Button/Button.jsx';
import { Dialog } from '../../primitives/Dialog/Dialog.jsx';
import { Progress } from '../../primitives/Progress/Progress.jsx';
import { cx } from '../../primitives/_utils/cx.js';

const EMPTY_CROP = { unit: '%', x: 0, y: 0, width: 100, height: 100 };

function isFunction(value) {
  return typeof value === 'function';
}

function buildCroppedFile({ image, crop, fileName, fileType }) {
  if (!image || !crop?.width || !crop?.height) return null;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement('canvas');
  const targetWidth = Math.round(crop.width * scaleX);
  const targetHeight = Math.round(crop.height * scaleY);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    targetWidth,
    targetHeight
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to crop image'));
          return;
        }
        resolve(
          new File([blob], fileName, {
            type: blob.type || fileType || 'image/png'
          })
        );
      },
      fileType || 'image/png',
      0.92
    );
  });
}

export function ImageUpload({
  label = 'Image',
  description = '',
  value = '',
  onChange,
  onUpload,
  accept = 'image/*',
  variant = 'cover',
  uploadLabel = 'Upload image',
  changeLabel = 'Change image',
  removeLabel = 'Remove image',
  cropTitle = 'Adjust image',
  cropDescription = 'Crop or use the original image before uploading.',
  useOriginalLabel = 'Use original',
  cropUploadLabel = 'Crop & upload',
  disabled = false,
  className = ''
}) {
  const inputRef = useRef(null);
  const imageRef = useRef(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [crop, setCrop] = useState(EMPTY_CROP);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const containerClassName = useMemo(
    () => cx('c-ImageUpload', `c-ImageUpload--${variant}`, className),
    [className, variant]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openFileDialog = () => {
    if (disabled) return;
    if (inputRef.current) inputRef.current.click();
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setCrop(EMPTY_CROP);
    setCompletedCrop(null);
    setStatusMessage('');
    setUploadProgress(0);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(nextUrl);
    setCrop(EMPTY_CROP);
    setCompletedCrop(null);
    setStatusMessage('');
    setDialogOpen(true);
  };

  const handleUpload = async (fileToUpload) => {
    if (!fileToUpload || !isFunction(onUpload)) return;
    setUploading(true);
    setStatusMessage('');
    setUploadProgress(0);
    try {
      const url = await onUpload({
        file: fileToUpload,
        onProgress: (next) => setUploadProgress(next)
      });
      if (url && isFunction(onChange)) onChange(url);
      setDialogOpen(false);
      resetSelection();
    } catch (err) {
      setStatusMessage(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCropUpload = async () => {
    if (!selectedFile) return;
    const image = imageRef.current;
    const safeCrop = completedCrop || crop;
    const fileName = `${selectedFile.name.replace(/\.\w+$/, '')}-crop`;
    try {
      const croppedFile = await buildCroppedFile({
        image,
        crop: safeCrop,
        fileName,
        fileType: selectedFile.type
      });
      await handleUpload(croppedFile || selectedFile);
    } catch (err) {
      setStatusMessage(err?.message || 'Crop failed');
    }
  };

  const handleUseOriginal = async () => {
    if (!selectedFile) return;
    await handleUpload(selectedFile);
  };

  return (
    <div className={containerClassName}>
      <div className="c-ImageUpload__header">
        <div>
          <div className="c-ImageUpload__label">{label}</div>
          {description ? <div className="c-ImageUpload__description">{description}</div> : null}
        </div>
        <div className="c-ImageUpload__actions">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="c-ImageUpload__input"
            disabled={disabled}
          />
          <Button type="button" variant="secondary" onClick={openFileDialog} disabled={disabled}>
            {value ? changeLabel : uploadLabel}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => isFunction(onChange) && onChange('')}
              disabled={disabled}
            >
              {removeLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {value ? (
        <div className="c-ImageUpload__preview">
          <img src={value} alt="Selected upload" className="c-ImageUpload__previewImage" />
        </div>
      ) : (
        <div className="c-ImageUpload__placeholder">No image selected.</div>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="c-DialogBackdrop" />
          <Dialog.Popup className="c-DialogPanel c-ImageUpload__dialog">
            <Dialog.Title>{cropTitle}</Dialog.Title>
            <Dialog.Description>{cropDescription}</Dialog.Description>
            <div className="c-ImageUpload__cropArea">
              {previewUrl ? (
                <ReactCrop
                  crop={crop}
                  onChange={(next) => setCrop(next)}
                  onComplete={(next) => setCompletedCrop(next)}
                  className="c-ImageUpload__cropper"
                >
                  <img
                    src={previewUrl}
                    alt="Crop preview"
                    className="c-ImageUpload__cropImage"
                    onLoad={(event) => {
                      imageRef.current = event.currentTarget;
                      setCrop(EMPTY_CROP);
                    }}
                  />
                </ReactCrop>
              ) : null}
            </div>
            {statusMessage ? <div className="c-ImageUpload__status">{statusMessage}</div> : null}
            {uploading ? (
              <div className="c-ImageUpload__progress">
                <Progress.Root value={uploadProgress} max={100}>
                  <Progress.Label>Uploading</Progress.Label>
                  <Progress.Track>
                    <Progress.Indicator />
                  </Progress.Track>
                  <Progress.Value />
                </Progress.Root>
              </div>
            ) : null}
            <div className="c-ImageUpload__dialogActions">
              <Dialog.Close asChild>
                <Button variant="secondary" type="button" disabled={uploading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="button" variant="secondary" onClick={handleUseOriginal} disabled={uploading}>
                {useOriginalLabel}
              </Button>
              <Button type="button" onClick={handleCropUpload} disabled={uploading}>
                {cropUploadLabel}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
