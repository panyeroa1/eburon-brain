
import React, { useState, useRef } from 'react';
import { UploadIcon } from './icons';

interface InputFormProps {
  onAnalyze: (url: string, description: string, imageFile: File | null, transcript: string) => void;
  disabled: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onAnalyze, disabled }) => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (description.trim()) {
      onAnalyze(url, description, imageFile, transcript);
    } else {
      alert('Please provide a description of the content.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
          Social Media URL (optional)
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/video/123"
          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
          Content Description*
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
          placeholder="Is this authentic? Describe the content here..."
          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
        />
      </div>

      <div>
        <label htmlFor="transcript" className="block text-sm font-medium text-gray-300 mb-1">
          Speech/Transcript Analysis (optional)
        </label>
        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={3}
          placeholder="Paste transcript or describe the speech here to check for AI-like language..."
          className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Upload Video Snapshot (optional, recommended)
        </label>
        <div 
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:border-cyan-400 transition"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleImageDrop}
          onDragOver={handleDragOver}
        >
          <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg" />
          ) : (
            <div className="space-y-1 text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {disabled ? 'Analyzing...' : 'Analyze Content'}
        </button>
      </div>
    </form>
  );
};