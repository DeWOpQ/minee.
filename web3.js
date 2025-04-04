import { InjectedConnector } from '@web3-react/injected-connector';
import { ethers } from 'ethers';

export const injected = new InjectedConnector({
  supportedChainIds: [1, 56, 137, 43114] // Ethereum, BSC, Polygon, Avalanche
});

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return null;
}; 