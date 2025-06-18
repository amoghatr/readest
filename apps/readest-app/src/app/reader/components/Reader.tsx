'use client';

import clsx from 'clsx';
import * as React from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';

import { AboutWindow } from '@/components/AboutWindow';
import { Toast } from '@/components/Toast';
import { UpdaterWindow } from '@/components/UpdaterWindow';
import { useEnv } from '@/context/EnvContext';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { useTheme } from '@/hooks/useTheme';
import { isTauriAppPlatform } from '@/services/environment';
import { useChatStore } from '@/store/chatStore';
import { useDeviceControlStore } from '@/store/deviceStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useThemeStore } from '@/store/themeStore';
import { getSysFontsList, setSystemUIVisibility } from '@/utils/bridge';
import { eventDispatcher } from '@/utils/event';
import { mountAdditionalFonts } from '@/utils/font';
import { interceptWindowOpen } from '@/utils/open';
import ReaderContent from './ReaderContent';

const Reader: React.FC<{ ids?: string }> = ({ ids }) => {
  const { envConfig, appService } = useEnv();
  const { setLibrary } = useLibraryStore();
  const { hoveredBookKey } = useReaderStore();
  const { settings, setSettings } = useSettingsStore();
  const { isSideBarVisible, setSideBarVisible } = useSidebarStore();
  const { isNotebookVisible, setNotebookVisible } = useNotebookStore();
  const { isChatVisible, setChatVisible } = useChatStore();
  const { isDarkMode, showSystemUI, dismissSystemUI } = useThemeStore();
  const { acquireBackKeyInterception, releaseBackKeyInterception } = useDeviceControlStore();
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const isInitiating = useRef(false);

  useTheme({ systemUIVisible: false, appThemeColor: 'base-100' });
  useScreenWakeLock(settings.screenWakeLock);

  useEffect(() => {
    mountAdditionalFonts(document);
    interceptWindowOpen();
    if (isTauriAppPlatform()) {
      setTimeout(getSysFontsList, 3000);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (appService?.isMobileApp && !document.hidden) {
        dismissSystemUI();
        setSystemUIVisibility({ visible: false, darkMode: isDarkMode });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appService, isDarkMode]);

  const handleKeyDown = (event: CustomEvent) => {
    if (event.detail.keyName === 'Back') {
      setSideBarVisible(false);
      setNotebookVisible(false);
      setChatVisible(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!appService?.isAndroidApp) return;
    if (isSideBarVisible || isNotebookVisible || isChatVisible) {
      acquireBackKeyInterception();
      eventDispatcher.onSync('native-key-down', handleKeyDown);
    }
    if (!isSideBarVisible && !isNotebookVisible && !isChatVisible) {
      releaseBackKeyInterception();
      eventDispatcher.offSync('native-key-down', handleKeyDown);
    }
    return () => {
      if (appService?.isAndroidApp) {
        releaseBackKeyInterception();
        eventDispatcher.offSync('native-key-down', handleKeyDown);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSideBarVisible, isNotebookVisible, isChatVisible]);

  useEffect(() => {
    if (isInitiating.current) return;
    isInitiating.current = true;
    const initLibrary = async () => {
      const appService = await envConfig.getAppService();
      const settings = await appService.loadSettings();
      setSettings(settings);
      setLibrary(await appService.loadLibraryBooks());
      setLibraryLoaded(true);
    };

    initLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!appService?.isMobileApp) return;
    const systemUIVisible = !!hoveredBookKey;
    setSystemUIVisibility({ visible: systemUIVisible, darkMode: isDarkMode });
    if (systemUIVisible) {
      showSystemUI();
    } else {
      dismissSystemUI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredBookKey]);

  return (
    libraryLoaded &&
    settings.globalReadSettings && (
      <div
        className={clsx(
          `reader-page bg-base-100 text-base-content select-none`,
          !isSideBarVisible && appService?.hasRoundedWindow && 'rounded-window',
        )}
      >
        <Suspense>
          <ReaderContent ids={ids} settings={settings} />
          <AboutWindow />
          {appService?.isAndroidApp && <UpdaterWindow />}
          <Toast />
        </Suspense>
      </div>
    )
  );
};

export default Reader;
