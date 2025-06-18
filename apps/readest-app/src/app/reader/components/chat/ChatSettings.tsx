import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import React, { useState } from 'react';
import { HiOutlineInformationCircle, HiOutlineKey } from 'react-icons/hi2';

const ChatSettings: React.FC = () => {
  const _ = useTranslation();
  const { settings, setSettings, saveSettings } = useSettingsStore();
  const envConfig = useEnv();

  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [model, setModel] = useState(settings.geminiModel || 'gemini-2.5-flash');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        geminiApiKey: apiKey,
        geminiModel: model,
        aiChatEnabled: !!apiKey,
      };

      setSettings(updatedSettings);

      // Initialize AI service immediately
      if (apiKey) {
        await import('@/services/aiService').then(({ initializeAIService }) => {
          initializeAIService({
            geminiApiKey: apiKey,
            geminiModel: model,
          });
        });
      }

      // Save settings using the environment-specific method
      try {
        await saveSettings(envConfig as any, updatedSettings);
      } catch (error) {
        // If saving fails, still keep the settings in memory
        console.warn('Failed to persist settings:', error);
      }

      setIsVisible(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setApiKey(settings.geminiApiKey || '');
    setModel(settings.geminiModel || 'gemini-2.5-flash');
    setIsVisible(false);
  };

  return (
    <>
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => setIsVisible(true)}
        title={_('Chat Settings')}
      >
        <HiOutlineKey size={16} />
      </button>

      {isVisible && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{_('Chat Settings')}</h3>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">{_('Gemini API Key')}</span>
              </label>
              <input
                type="password"
                placeholder="Enter your Gemini API key"
                className="input input-bordered w-full"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt flex items-center gap-1">
                  <HiOutlineInformationCircle size={14} />
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    {_('Get your API key from Google AI Studio')}
                  </a>
                </span>
              </label>
            </div>

            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">{_('Model')}</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash</option>
              </select>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {_('Cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving || !apiKey}
              >
                {isSaving ? _('Saving...') : _('Save')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancel} />
        </div>
      )}
    </>
  );
};

export default ChatSettings;