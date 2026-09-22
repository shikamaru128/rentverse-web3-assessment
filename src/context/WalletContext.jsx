import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext(null);

const getErrorMessage = (error) => {
  if (error?.code === 4001) {
    return 'Wallet connection request was rejected.';
  }

  if (error?.code === -32002) {
    return 'A MetaMask connection request is already pending.';
  }

  return error?.message || 'Unable to connect to MetaMask.';
};

const parseChainId = (chainId) => {
  if (typeof chainId === 'number') {
    return chainId;
  }

  return Number.parseInt(chainId, 16);
};

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const updateAccount = useCallback((accounts) => {
    const nextAccount = accounts?.[0] ? ethers.utils.getAddress(accounts[0]) : null;

    setAccount(nextAccount);
    setStatus(nextAccount ? 'connected' : 'disconnected');
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setStatus('unavailable');
      setError('MetaMask is not installed. Install the extension to connect a wallet.');
      return;
    }

    setIsLoading(true);
    setStatus('connecting');
    setError(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      updateAccount(accounts);
      setChainId(network.chainId);
    } catch (connectionError) {
      setStatus('error');
      setError(getErrorMessage(connectionError));
    } finally {
      setIsLoading(false);
    }
  }, [updateAccount]);

  useEffect(() => {
    const ethereum = window.ethereum;

    if (!ethereum) {
      setStatus('unavailable');
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;

    const restoreConnection = async () => {
      try {
        const [accounts, currentChainId] = await Promise.all([
          ethereum.request({ method: 'eth_accounts' }),
          ethereum.request({ method: 'eth_chainId' }),
        ]);

        if (isMounted) {
          updateAccount(accounts);
          setChainId(parseChainId(currentChainId));
        }
      } catch (restoreError) {
        if (isMounted) {
          setStatus('error');
          setError(getErrorMessage(restoreError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const handleAccountsChanged = (accounts) => {
      setError(null);

      try {
        updateAccount(accounts);
      } catch (accountError) {
        setStatus('error');
        setError(getErrorMessage(accountError));
      }
    };

    const handleChainChanged = (nextChainId) => {
      setChainId(parseChainId(nextChainId));
      setError(null);
    };

    restoreConnection();
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      isMounted = false;
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [updateAccount]);

  const value = useMemo(() => ({
    account,
    chainId,
    status,
    isConnected: status === 'connected',
    isLoading,
    error,
    connectWallet,
  }), [account, chainId, status, isLoading, error, connectWallet]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider.');
  }

  return context;
}

export function shortenAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}
