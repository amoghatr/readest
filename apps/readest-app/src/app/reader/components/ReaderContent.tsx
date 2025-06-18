'use client';

import clsx from 'clsx';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { useEnv } from '@/context/EnvContext';
import { parseOpenWithFiles } from '@/helpers/openWith';
import { BOOK_IDS_SEPARATOR } from '@/services/constants';
import { isTauriAppPlatform } from '@/services/environment';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { Book } from '@/types/book';
import { SystemSettings } from '@/types/settings';
import { eventDispatcher } from '@/utils/event';
import { uniqueId } from '@/utils/misc';
import { navigateToLibrary } from '@/utils/nav';
import { tauriHandleClose, tauriHandleOnCloseWindow } from '@/utils/window';

import BookDetailModal from '@/components/BookDetailModal';
import Spinner from '@/components/Spinner';
import useBookShortcuts from '../hooks/useBookShortcuts';
import useBooksManager from '../hooks/useBooksManager';
import BooksGrid from './BooksGrid';
import ChatPanel from './chat/ChatPanel';
import Notebook from './notebook/Notebook';
import SideBar from './sidebar/SideBar';

const ReaderContent: React.FC<{ ids?: string; settings: SystemSettings }> = ({ ids, settings }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { envConfig, appService } = useEnv();
  const { bookKeys, dismissBook, getNextBookKey } = useBooksManager();
  const { sideBarBookKey, setSideBarBookKey } = useSidebarStore();
  const { saveSettings } = useSettingsStore();
  const { getConfig, getBookData, saveConfig } = useBookDataStore();
  const { getView, setBookKeys, getViewSettings } = useReaderStore();
  const { initViewState, getViewState, clearViewState } = useReaderStore();
  const [showDetailsBook, setShowDetailsBook] = useState<Book | null>(null);
  const isInitiating = useRef(false);
  const [loading, setLoading] = useState(false);

  useBookShortcuts({ sideBarBookKey, bookKeys });

  useEffect(() => {
    if (isInitiating.current) return;
    isInitiating.current = true;

    const bookIds = ids || searchParams?.get('ids') || '';
    const initialIds = bookIds.split(BOOK_IDS_SEPARATOR).filter(Boolean);
    const initialBookKeys = initialIds.map((id) => `${id}-${uniqueId()}`);
    setBookKeys(initialBookKeys);
    const uniqueIds = new Set<string>();
    console.log('Initialize books', initialBookKeys);
    initialBookKeys.forEach((key, index) => {
      const id = key.split('-')[0]!;
      const isPrimary = !uniqueIds.has(id);
      uniqueIds.add(id);
      if (!getViewState(key)) {
        initViewState(envConfig, id, key, isPrimary).catch((error) => {
          console.log('Error initializing book', key, error);
        });
        if (index === 0) setSideBarBookKey(key);
      }
    });

    const handleShowBookDetails = (event: CustomEvent) => {
      const book = event.detail as Book;
      setShowDetailsBook(book);
      return true;
    };
    eventDispatcher.onSync('show-book-details', handleShowBookDetails);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bookKeys && bookKeys.length > 0) {
      const settings = useSettingsStore.getState().settings;
      settings.lastOpenBooks = bookKeys.map((key) => key.split('-')[0]!);
      saveSettings(envConfig, settings);
    }

    if (isTauriAppPlatform()) tauriHandleOnCloseWindow(handleCloseBooks);
    window.addEventListener('beforeunload', handleCloseBooks);
    eventDispatcher.on('quit-app', handleCloseBooks);
    return () => {
      window.removeEventListener('beforeunload', handleCloseBooks);
      eventDispatcher.off('quit-app', handleCloseBooks);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKeys]);

  const saveBookConfig = async (bookKey: string) => {
    const config = getConfig(bookKey);
    const { book } = getBookData(bookKey) || {};
    const { isPrimary } = getViewState(bookKey) || {};
    if (isPrimary && book && config) {
      eventDispatcher.dispatch('sync-book-progress', { bookKey });
      const settings = useSettingsStore.getState().settings;
      await saveConfig(envConfig, bookKey, config, settings);
    }
  };

  const saveConfigAndCloseBook = async (bookKey: string) => {
    console.log('Closing book', bookKey);
    try {
      getView(bookKey)?.close();
      getView(bookKey)?.remove();
    } catch {
      console.info('Error closing book', bookKey);
    }
    eventDispatcher.dispatch('tts-stop', { bookKey });
    await saveBookConfig(bookKey);
    clearViewState(bookKey);
  };

  const saveSettingsAndGoToLibrary = () => {
    saveSettings(envConfig, settings);
    navigateToLibrary(router);
  };

  const handleCloseBooks = async () => {
    const settings = useSettingsStore.getState().settings;
    await Promise.all(bookKeys.map((key) => saveConfigAndCloseBook(key)));
    await saveSettings(envConfig, settings);
  };

  const handleCloseBooksToLibrary = () => {
    handleCloseBooks();
    navigateToLibrary(router);
  };

  const handleCloseBook = async (bookKey: string) => {
    saveConfigAndCloseBook(bookKey);
    if (sideBarBookKey === bookKey) {
      setSideBarBookKey(getNextBookKey(sideBarBookKey));
    }
    dismissBook(bookKey);
    if (bookKeys.filter((key) => key !== bookKey).length == 0) {
      const openWithFiles = (await parseOpenWithFiles()) || [];
      if (openWithFiles.length > 0 && !appService?.isMobile) {
        tauriHandleClose();
      } else {
        saveSettingsAndGoToLibrary();
      }
    }
  };

  if (!bookKeys || bookKeys.length === 0) return null;
  const bookData = getBookData(bookKeys[0]!);
  const viewSettings = getViewSettings(bookKeys[0]!);
  if (!bookData || !bookData.book || !bookData.bookDoc || !viewSettings) {
    setTimeout(() => setLoading(true), 300);
    return (
      loading && (
        <div className={clsx('hero hero-content', appService?.isIOSApp ? 'h-[100vh]' : 'h-dvh')}>
          <Spinner loading={true} />
        </div>
      )
    );
  }

  return (
    <div className={clsx('flex', appService?.isIOSApp ? 'h-[100vh]' : 'h-dvh')}>
      <SideBar onGoToLibrary={handleCloseBooksToLibrary} />
      <BooksGrid bookKeys={bookKeys} onCloseBook={handleCloseBook} />
      <Notebook />
      <ChatPanel />
      {showDetailsBook && (
        <BookDetailModal
          isOpen={!!showDetailsBook}
          book={showDetailsBook}
          onClose={() => setShowDetailsBook(null)}
        />
      )}
    </div>
  );
};

export default ReaderContent;
