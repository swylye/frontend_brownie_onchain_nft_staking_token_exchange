import { Contract, providers } from "ethers";
import { NFT_CONTRACT_ABI, STAKING_CONTRACT_ABI, EXCHANGE_CONTRACT_ABI, NFT_CONTRACT_ADDRESS, STAKING_CONTRACT_ADDRESS, EXCHANGE_CONTRACT_ADDRESS } from "../constants";

// Helper function to return NFT Contract instance
// given a Provider/Signer
export const getNftContractInstance = (providerOrSigner) => {
    return new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        providerOrSigner
    );
};

// Helper function to return NFT staking Contract instance
// given a Provider/Signer
export const getStakingContractInstance = (providerOrSigner) => {
    return new Contract(
        STAKING_CONTRACT_ADDRESS,
        STAKING_CONTRACT_ABI,
        providerOrSigner
    );
};

// Helper function to return NFT staking Contract instance
// given a Provider/Signer
export const getExchangeContractInstance = (providerOrSigner) => {
    return new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        providerOrSigner
    );
};
