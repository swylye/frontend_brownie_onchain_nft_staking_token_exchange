import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { getNftContractInstance, getStakingContractInstance } from "../utils/helperFunctions"
import ResponsiveAppBar from "../utils/responsiveAppBar"
import LoadingButton from '@mui/lab/LoadingButton';
import Button from '@mui/material/Button';

import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import AdbIcon from '@mui/icons-material/Adb';

export default function Home() {
    // walletConnected keep track of whether the user's wallet is connected or not
    const [walletConnected, setWalletConnected] = useState(false);
    // loading is set to true when we are waiting for a transaction to get mined
    const [loading, setLoading] = useState(false);
    // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
    const web3ModalRef = useRef();

    // nftMinted keeps track of how many NFTs were minted
    const [nftMinted, setNftMinted] = useState("0");
    // stakeTokenId keeps track of the token ID to be staked
    const [stakeTokenId, setStakeTokenId] = useState();
    // unstakeTokenId keeps track of the token ID to be unstaked
    const [unstakeTokenId, setUnstakeTokenId] = useState();
    // claimableReward keeps track of the claimable reward token amount
    const [claimableReward, setClaimableReward] = useState("0");
    // stakingRewardAmount keeps track of the staking reward per NFT per day
    const [stakingRewardAmount, setStakingRewardAmount] = useState("0");
    // nftStakedCount keeps track of the number of NFTs staked
    const [nftStakedCount, setNftStakedCount] = useState("0")
    // userNftMinted keeps track of the number of NFTs minted by the user
    const [userNftMinted, setUserNftMinted] = useState(0);

    // availableToStake keeps track of whether user has any NFT(s) to stake
    const [availableToStake, setAvailableToStake] = useState(false);
    // availableToUnstake keeps track of whether user has any NFT(s) to unstake
    const [availableToUnstake, setAvailableToUnstake] = useState(false);

    // userStakedCount keeps track of the count of NFTs staked by the user
    const [userStakedCount, setUserStakedCount] = useState(0);
    // userUnstakedCount keeps track of the count of unstaked NFTs by the user
    const [userUnstakedCount, setUserUnstakedCount] = useState(0);

    // userStakedTokenIdList keeps track of the list of token IDs staked by the user
    const [userStakedTokenIdList, setUserStakedTokenIdList] = useState([]);
    // userUnstakedTokenIdList keeps track of the list of unstaked token IDs by the user
    const [userUnstakedTokenIdList, setUserUnstakedTokenIdList] = useState([]);


    /**
    * getNftStakedCount: Retrieves the number of NFTs staked
    */
    const getNftStakedCount = async () => {
        try {
            // Get the provider from web3Modal, which in our case is MetaMask
            // No need for the Signer here, as we are only reading state from the blockchain
            const provider = await getProviderOrSigner();
            const nftContract = getNftContractInstance(provider);
            const _nftMintedCount = await nftContract.totalSupply();
            const stakingContract = getStakingContractInstance(provider);
            let _nftStakedCount = 0;
            for (let i = 1; i <= _nftMintedCount; i++) {
                if (await stakingContract.tokenIdStaked(i) == true) {
                    _nftStakedCount = _nftStakedCount + 1;
                }
            }
            setNftStakedCount(_nftStakedCount.toString());
        } catch (err) {
            console.error(err);
        }
    };

    /**
    * getStakingRewardAmount: Retrieves amount of reward tokens for staking 1 NFT in a day
    */
    const getStakingRewardAmount = async () => {
        try {
            // Get the provider from web3Modal, which in our case is MetaMask
            // No need for the Signer here, as we are only reading state from the blockchain
            const provider = await getProviderOrSigner();
            const stakingContract = getStakingContractInstance(provider);
            const stakingRewardWei = await stakingContract.rewardPerDay();
            const stakingRewardEther = utils.formatUnits(stakingRewardWei, "ether")
            setStakingRewardAmount(stakingRewardEther.toString());
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * getClaimableReward: Retrieves amount of reward tokens claimable by user
     */
    const getClaimableReward = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const userClaimableRewardWei = await stakingContract.getAvailableRewards(await signer.getAddress());
            const userClaimableRewardEther = utils.formatUnits(userClaimableRewardWei, "ether");
            setClaimableReward(userClaimableRewardEther);
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

    const getAvailableToUnstake = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const staker = await stakingContract.addressToStaker(await signer.getAddress());
            const stakedAmount = parseInt(staker.stakedAmount["_hex"], 16);
            if (stakedAmount > 0) {
                setAvailableToUnstake(true);
            }
            else {
                setAvailableToUnstake(false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getAvailableToStake = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const nftContract = getNftContractInstance(signer);
            const stakingContract = getStakingContractInstance(signer);
            const _count = await nftContract.balanceOf(await signer.getAddress());
            const tokenCount = parseInt(_count['_hex'], 16);
            const unstakedCount = 0;
            for (let i = 0; i < tokenCount; i++) {
                const _rawVariable = await nftContract.tokenOfOwnerByIndex(await signer.getAddress(), i);
                const _variable = parseInt(_rawVariable['_hex'], 16);
                if (await stakingContract.tokenIdStaked(_variable) == false) {
                    unstakedCount += 1;
                }
            }
            if (unstakedCount == 0) {
                setAvailableToStake(false);
            }
            else {
                setAvailableToStake(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * getUserStakedTokenIdList: Retrieves user's staked token ID list
     */
    const getUserStakedTokenIdList = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const stakedTokenIdList = await stakingContract.getStakedTokenIdList(await signer.getAddress());
            const _array = [];
            for (let i = 0; i < stakedTokenIdList.length; i++) {
                _array.push(parseInt(stakedTokenIdList[i]['_hex'], 16));
            }
            setUserStakedTokenIdList(_array);
        } catch (err) {
            console.error(err);
        }
    };

    const getUserUnstakedTokenIdList = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const nftContract = getNftContractInstance(signer);
            const stakingContract = getStakingContractInstance(signer);
            const _count = await nftContract.balanceOf(await signer.getAddress());
            const tokenCount = parseInt(_count['_hex'], 16);
            const tokenIdList = [];
            for (let i = 0; i < tokenCount; i++) {
                const _rawVariable = await nftContract.tokenOfOwnerByIndex(await signer.getAddress(), i);
                const _variable = parseInt(_rawVariable['_hex'], 16);
                if (await stakingContract.tokenIdStaked(_variable) == false) {
                    tokenIdList.push(_variable);
                }
            }
            setUserUnstakedTokenIdList(tokenIdList);
        } catch (err) {
            console.error(err);
        }
    };

    /*
       renderConnectWalletButton: Returns a button to connect your wallet
     */
    const renderConnectWalletButton = () => {
        return (
            <button onClick={connectWallet} className={styles.button}>
                Connect your wallet
            </button>
        );
    }

    /*
       renderClaimRewards: Returns a button claim rewards
     */
    const renderClaimRewards = () => {
        return (
            <Box component="span" sx={{ p: 3 }}>
                {/* <Box maxWidth="sm"> */}
                <FormControl sx={{ m: 2, minWidth: 120 }} size="small">You have earned {parseFloat(claimableReward).toFixed(3)} reward tokens!</FormControl>
                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                    <LoadingButton onClick={claimAllRewards} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={parseFloat(claimableReward) > 0 ? false : true}>
                        Claim your reward tokens! 🎁
                    </LoadingButton>
                </FormControl>
            </Box>
        );
    }
    /*
       renderStakeComponent: Returns a stake button and dropdown menu for tokenID options based on the state of the dapp
     */
    const renderStakeComponent = () => {
        // If we are currently waiting for something, return a loading button
        return (
            <Box maxWidth="sm">
                <FormControl sx={{ m: 0.8, minWidth: 120 }} size="small">
                    <InputLabel id="demo-select-small">TokenID</InputLabel>
                    <Select
                        labelId="demo-select-small"
                        id="demo-select-small"
                        value={stakeTokenId}
                        label="TokenID"
                        onChange={(e) => setStakeTokenId(e.target.value)}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {userUnstakedTokenIdList.map(e => <MenuItem value={e} key={e}>{e}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                    <LoadingButton onClick={stakeNft} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={availableToStake ? false : true}>
                        Stake your NFT! 🥩
                    </LoadingButton>
                </FormControl>
                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                    <LoadingButton onClick={stakeAllNft} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={availableToStake ? false : true}>
                        🥩 Stake all! 🥩
                    </LoadingButton>
                </FormControl>
            </Box >
        );
    };

    /*
       renderUnstakeComponent: Returns a stake button and dropdown menu for tokenID options based on the state of the dapp
     */
    const renderUnstakeComponent = () => {
        // If we are currently waiting for something, return a loading button
        return (
            <Box maxWidth="sm">
                <FormControl sx={{ m: 0.8, minWidth: 120 }} size="small">
                    <InputLabel id="demo-select-small">TokenID</InputLabel>
                    <Select
                        labelId="demo-select-small"
                        id="demo-select-small"
                        value={unstakeTokenId}
                        label="TokenID"
                        onChange={(e) => setUnstakeTokenId(e.target.value)}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {userStakedTokenIdList.map(e => <MenuItem value={e} key={e}>{e}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                    <LoadingButton onClick={unstakeNft} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={availableToUnstake ? false : true}>
                        Unstake your NFT! 🐮
                    </LoadingButton>
                </FormControl>
                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                    <LoadingButton onClick={unstakeAllNft} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={availableToUnstake ? false : true}>
                        🐮 Unstake all! 🐮
                    </LoadingButton>
                </FormControl>
            </Box >
        );
    };

    // ============================================================== 
    // FUNCTIONS FOR WRITE CONTRACT INTERACTIONS
    // ============================================================== 
    /**
     * claimAllRewards: Claims all rewards
     */
    const claimAllRewards = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const tx = await stakingContract.claimRewards();
            setLoading(true);
            await tx.wait(1);
            setLoading(false);
            window.alert("Congrats, you have claimed all your reward tokens!");
            setClaimableReward("0");
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * stakeNft: Stake NFT
     */
    const stakeNft = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const tx = await stakingContract.stake(stakeTokenId);
            setLoading(true);
            await tx.wait(1);
            setLoading(false);
            window.alert("Congrats, you have staked your NFT!");
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * stakeAllNft: Stake all NFT
     */
    const stakeAllNft = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const tx = await stakingContract.stakeAll();
            setLoading(true);
            await tx.wait(1);
            setLoading(false);
            window.alert("Congrats, you have staked all your NFT(s)!");
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * unstakeNft: Unstake NFT
     */
    const unstakeNft = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const tx = await stakingContract.unstake(unstakeTokenId);
            setLoading(true);
            await tx.wait(1);
            setLoading(false);
            window.alert("You have unstaked your NFT!");
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * unstakeAllNft: Unstake all NFT
     */
    const unstakeAllNft = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const tx = await stakingContract.unstakeAll();
            setLoading(true);
            await tx.wait(1);
            setLoading(false);
            window.alert("You have unstaked all your NFT(s)!");
        } catch (err) {
            console.error(err);
        }
    };

    // ============================================================== 
    // ============================================================== 

    /**
     * Returns a Provider or Signer object representing the Ethereum RPC with or without the
     * signing capabilities of metamask attached
     *
     * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
     *
     * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
     * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
     * request signatures from the user using Signer functions.
     *
     * @param {*} needSigner - True if you need the signer, default false otherwise
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
            getStakingRewardAmount();
            getNftMinted();
            getUserNftMinted();
            getAvailableToUnstake();
            getAvailableToStake();
            getNftStakedCount();
            getUserStakedTokenIdList();
            getUserUnstakedTokenIdList();
            getClaimableReward();

            // set an interval to get the number of NFT minted and whether it has minted out every 5 seconds
            setInterval(async function () {
                await getNftMinted();
                await getNftStakedCount();
                await getUserNftMinted();
                await getAvailableToUnstake();
                await getAvailableToStake();
                await getUserStakedTokenIdList();
                await getUserUnstakedTokenIdList();
                await getClaimableReward();
            }, 5 * 1000);

        }
    }, [walletConnected]);


    return (
        <div>
            {ResponsiveAppBar()}
            <Head>
                <title>Stake your SVG NFT</title>
                <meta name="description" content="random-svg-nft" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            {/* <Container maxWidth="xl"> */}
            <div className={styles.main}>
                <h1 className={styles.title}>Stake and earn!</h1>
                <div className={styles.description}>
                    And best of all, your NFT(s) never have to leave your wallet!
                </div>
                <div className={styles.description}>
                    {nftStakedCount}/{nftMinted} are currently staked!
                </div>
                <div className={styles.description}>
                    Earn {stakingRewardAmount} reward tokens per day for each NFT staked!
                </div>
                <div>
                    {renderStakeComponent()}
                </div>
                <div>
                    {renderUnstakeComponent()}
                </div>
                <br />
                <br />
                <div>
                    {renderClaimRewards()}
                </div>
            </div>
            {/* </Container> */}
            <footer className={styles.footer}>
                Made with &#10084; by SL
            </footer>
        </div>
    );
}