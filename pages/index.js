import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { getNftContractInstance, getStakingContractInstance } from "../utils/helperFunctions"
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Container from '@mui/material/Container';


export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // nftMaxSupply keeps track of the NFT collection max supply
  const [nftMaxSupply, setNftMaxSupply] = useState("0");
  // nftMintPrice keeps track of the NFT mint price
  const [nftMintPrice, setNftMintPrice] = useState("0");
  // nftMinted keeps track of how many NFTs were minted
  const [nftMinted, setNftMinted] = useState("0");
  // userNftMinted keeps track of how many NFTs were minted by the user
  const [userNftMinted, setUserNftMinted] = useState("0");
  // mintedOut keeps track of whether NFT collected has minted out
  const [mintedOut, setMintedOut] = useState(false);

  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  const delay = ms => new Promise(res => setTimeout(res, ms));

  /**
   * getNftMintPrice: Updates NFT mint price
   */
  const getNftMintPrice = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = getNftContractInstance(provider);
      const _mintPrice = await nftContract.mintPriceWei();
      setNftMintPrice(_mintPrice.toString());
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * checkMintedOut: Updates NFT mintedOut state if it has minted out
   */
  const checkMintedOut = async () => {
    try {
      if (nftMinted == nftMaxSupply) {
        setMintedOut(true);
      }
      else {
        setMintedOut(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getNftMinted: gets the count of NFTs that have been minted
   */
  const getNftMinted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      const nftContract = getNftContractInstance(provider);
      const _nftMinted = await nftContract.totalSupply();
      setNftMinted(_nftMinted.toString());
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getUserNftMinted: gets the count of NFTs that have been minted by user
   */
  const getUserNftMinted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const signer = await getProviderOrSigner(true);
      const nftContract = getNftContractInstance(signer);
      const _nftMinted = await nftContract.balanceOf(await signer.getAddress());
      setUserNftMinted(_nftMinted.toString());
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getNftMaxSupply: Returns max supply for the NFT collection
   */
  const getNftMaxSupply = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = getNftContractInstance(provider);
      const maxSupply = await nftContract.maxSupply();
      setNftMaxSupply(maxSupply.toString());
    }
    catch (err) {
      console.error(err);
    }
  };

  /**
   * mintNft: Initiate and complete NFT minting
   */
  const mintNft = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getNftContractInstance(signer);
      getNftMintPrice();
      const tx = await nftContract.create({ value: nftMintPrice });
      setLoading(true);
      window.alert("You have initiated the mint, there will be another transaction to approve in a couple minutes to complete the mint!");
      const tx_e = await tx.wait(1);
      const event = tx_e.events.find(event => event.event === 'RequestedRandomSVG');
      const [_requestId, _tokenId] = event.args;
      await delay(90000); //wait for 90 seconds before initiating complete mint function, chainlink needs time to come back to us with the random number
      const tx2 = await nftContract.completeMint(_tokenId);
      await tx2.wait(1);
      setLoading(false);
      window.alert("Congrats, you have minted a random NFT!");
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   */
  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please switch to the Rinkeby network!");
      throw new Error("Please switch to the Rinkeby network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  /*
      connectWallet: Connects the MetaMask wallet
    */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };




  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getNftMaxSupply();
      getNftMintPrice();
      getUserNftMinted();

      // set an interval to get the number of NFT minted and whether it has minted out every 5 seconds
      setInterval(async function () {
        await getNftMinted();
        await checkMintedOut();
      }, 5 * 1000);

      // // set an interval to get the number of NFT minted by user every 5 seconds
      setInterval(async function () {
        await getUserNftMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
    */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <Button variant="contained" size="medium" onClick={connectWallet}>
          Connect your wallet
        </Button>
      );
    }

    // Allow user to mint NFT
    else {
      return (
        <LoadingButton onClick={mintNft} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content">
          Generate your random NFT! 🚀
        </LoadingButton>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Random SVG NFT</title>
        <meta name="description" content="random-svg-nft" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxWidth="xl">
        <div className={styles.main}>
          <h1 className={styles.title}>Welcome fellow stranger on the internet!</h1>
          <div className={styles.description}>
            Come get your very own randomly generated SVG NFT, all for a cheap price of {nftMintPrice == "0" ? "0.05" : utils.formatEther(nftMintPrice)} ether!
          </div>
          <div className={styles.description}>
            {nftMinted}/{nftMaxSupply == "0" ? "500" : nftMaxSupply} have been minted
          </div>
          <div className={styles.description}>
            You have minted {userNftMinted} random NFTs so far
          </div>
          {renderButton()}
        </div>
      </Container>
    </div>
  );
}
