import Button from '@/components/button';
import { EventCategory, EventName } from '@/constants/event';
import { downloadClickAtom } from '@/store/web3/state';
import React, { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useRecoilState } from 'recoil';
import { useConnect } from 'wagmi';
import { WalletType } from './WalletPopover';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { getLastConnectedWallet } from '@/hooks/user';
ReactGA.event({ category: EventCategory.Global, action: EventName.ToInvitation });

type WalletConnectProps = {
  setWalletType?: (type: WalletType) => void;
};

function WalletConnect({ setWalletType }: WalletConnectProps) {
  const [retryWallet, setRetryWallet] = useState<{ type: string; index: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempted, setReconnectAttempted] = useState(false);
  const { connect, connectors } = useConnect({
    onSuccess: (_, { connector }) => {
      setIsConnecting(false);
      setRetryWallet(null);
      setReconnectAttempted(true);
      if (connector) {
        localStorage.setItem('lastConnectedWallet', connector.name);
      }
      ReactGA.event({ category: EventCategory.Global, action: EventName.ConnectResult, label: 'success' });
      toast.success('Wallet connected successfully.');
    },
    onError: (error, { connector }) => {
      setIsConnecting(false); // Always re-enable buttons
      setReconnectAttempted(true);
      ReactGA.event({ category: EventCategory.Global, action: EventName.ConnectResult, label: 'failed' });
      let walletType = connector?.name?.toLowerCase() || retryWallet?.type || '';
      handleWalletError(error, walletType);
      setRetryWallet(null); // Clear retryWallet so user can try any wallet again
    },
  });
  const [downloadClick, setDownloadClick] = useRecoilState(downloadClickAtom);

  // Enhanced error handling for each wallet type
  const handleWalletError = (error: any, walletType: string) => {
    const errorMessages: Record<string, string> = {
      'meta_mask': "Please install MetaMask extension or check if it's unlocked",
      'metamask': "Please install MetaMask extension or check if it's unlocked",
      'token_pocket': 'Please install TokenPocket or check if it\'s unlocked',
      'tokenpocket': 'Please install TokenPocket or check if it\'s unlocked',
      'bitget_wallet': 'Please install Bitget Wallet or check if it\'s unlocked',
      'bitkeep': 'Please install Bitget Wallet or check if it\'s unlocked',
      'particle_network': 'Particle Network connection failed. Please try again.',
      'particleauth': 'Particle Network connection failed. Please try again.',
      'wallet_connect': 'WalletConnect connection failed. Please try again.',
      'walletconnect': 'WalletConnect connection failed. Please try again.'
    };
    if (error?.message) {
      toast.error(errorMessages[walletType] || error.message);
    } else {
      toast.error(errorMessages[walletType] || 'Connection failed. Please try again.');
    }
  };

  // Auto-reconnect logic
  useEffect(() => {
    if (isConnecting || reconnectAttempted) return;
    const last = getLastConnectedWallet();
    if (last) {
      // Find connector index by name (case-insensitive)
      const idx = connectors.findIndex(c => c.name.toLowerCase() === last.toLowerCase());
      if (idx !== -1) {
        setIsConnecting(true);
        setRetryWallet({ type: connectors[idx].name.toLowerCase(), index: idx });
        toast.info('Reconnecting to your last wallet...');
        try {
          connect({ connector: connectors[idx] });
        } catch (error) {
          setIsConnecting(false);
          setReconnectAttempted(true);
          handleWalletError(error, connectors[idx].name.toLowerCase());
        }
      } else {
        setReconnectAttempted(true);
      }
    } else {
      setReconnectAttempted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors, isConnecting, reconnectAttempted]);

  /**
   * connectWallet
   * @param connector
   */
  const connectWallet = (connector: any | undefined) => {
    if (!connector) return;
    setIsConnecting(true);
    try {
      connect({ connector });
    } catch (error) {
      setIsConnecting(false);
      handleWalletError(error, connector.name?.toLowerCase() || '');
    }
  };

  const onConnectClick = (type: string, index: number) => {
    ReactGA.event({ category: EventCategory.Global, action: EventName.ConnectWallet, label: type });
    setRetryWallet(null);
    setReconnectAttempted(true);
    connectWallet(connectors[index]);
  };

  const onRetry = () => {
    if (retryWallet) {
      connectWallet(connectors[retryWallet.index]);
    }
  };

  return (
    <div className="flex-center-y p-6">
      <h4 className="text-xl font-medium">Connect wallet</h4>
      <div className="mt-6 grid grid-cols-2 gap-3 px-4">
        <Button type="bordered" className="flex-center col-span-2 gap-2" onClick={() => onConnectClick('meta_mask', 0)} disabled={isConnecting}>
          <img className="h-7.5 w-7.5" src="/img/metamask@2x.png" alt="meta_mask" />
          <span className="text-sm flex items-center">{isConnecting && retryWallet?.type === 'meta_mask' ? (<><span className="inline-block w-4 h-4 mr-1 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></span>Connecting...</>) : 'MetaMask'}</span>
        </Button>
        <Button type="bordered" className="flex-center gap-2" onClick={() => onConnectClick('token_pocket', 1)} disabled={isConnecting}>
          <img className="h-7.5 w-7.5" src="/img/tokenPocket.png" alt="TokenPocket" />
          <span className="text-sm flex items-center">{isConnecting && retryWallet?.type === 'token_pocket' ? (<><span className="inline-block w-4 h-4 mr-1 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></span>Connecting...</>) : 'TokenPocket'}</span>
        </Button>
        <Button type="bordered" className="flex-center gap-2" onClick={() => onConnectClick('bitget_wallet', 2)} disabled={isConnecting}>
          <img className="h-7.5 w-7.5" src="/img/bitgetWallet.png" alt="BitgetWallet" />
          <span className="text-sm flex items-center">{isConnecting && retryWallet?.type === 'bitget_wallet' ? (<><span className="inline-block w-4 h-4 mr-1 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></span>Connecting...</>) : 'Bitget Wallet'}</span>
        </Button>
        <Button type="bordered" className="flex-center gap-2 px-6" onClick={() => onConnectClick('particle_network', 3)} disabled={isConnecting}>
          <img className="h-7.5 w-7.5" src="/img/particleNetwork.png" alt="ParticleNetwork" />
          <span className="whitespace-nowrap text-sm flex items-center">{isConnecting && retryWallet?.type === 'particle_network' ? (<><span className="inline-block w-4 h-4 mr-1 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></span>Connecting...</>) : 'Particle Network'}</span>
        </Button>
        <Button type="bordered" className="flex-center gap-2" onClick={() => onConnectClick('wallet_connect', 4)} disabled={isConnecting}>
          <img className="h-7.5 w-7.5" src="/img/walletconnet.png" alt="wallet_connect" />
          <span className="text-sm flex items-center">{isConnecting && retryWallet?.type === 'wallet_connect' ? (<><span className="inline-block w-4 h-4 mr-1 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></span>Connecting...</>) : 'WalletConnect'}</span>
        </Button>
      </div>
      {retryWallet && !isConnecting && reconnectAttempted && (
        <div className="mt-4 px-4 text-xs text-red-500">
          <span>Connection failed. </span>
          <Button type="bordered" className="ml-2" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      <div className="mt-4 px-4 text-xs text-gray">
        {downloadClick ? 'Please refresh page after installation. Re-install ' : "Don't have one? "}
        <span
          className="cursor-pointer text-blue"
          onClick={() => {
            setDownloadClick(true);
            setWalletType?.(WalletType.DOWNLOAD);
          }}
        >
          click here
        </span>
      </div>
    </div>
  );
}

export default React.memo(WalletConnect);
