import { Contract, providers, utils, BigNumber } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { getNftContractInstance, getStakingContractInstance, getExchangeContractInstance } from "../utils/helperFunctions"
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import ResponsiveAppBar from "../utils/responsiveAppBar"
import { EXCHANGE_CONTRACT_ADDRESS } from "../constants";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

export default function Home() {
    // walletConnected keep track of whether the user's wallet is connected or not
    const [walletConnected, setWalletConnected] = useState(false);
    // loading is set to true when we are waiting for a transaction to get mined
    const [loading, setLoading] = useState(false);
    // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
    const web3ModalRef = useRef();

    const zero = BigNumber.from(0);

    const [swapDirectionEthToToken, setSwapDirectionEthToToken] = useState("true");
    const handleChange = async (event, newSwapDirection) => {
        if (newSwapDirection !== null) {
            setSwapDirectionEthToToken("true");
        }
        setSwapDirectionEthToToken(newSwapDirection);
        const swapAmountWei = utils.parseEther(swapAmount).toString();
        const swapReturnAmountWei = await getSwapReturnAmount(swapAmountWei, swapDirectionEthToToken);
        setSwapReceiveAmount(swapReturnAmountWei);
    };

    const [swapReceiveAmount, setSwapReceiveAmount] = useState(zero);

    // From user input, so these would be in ETH (not wei). Conversion needed before passing them into function
    const [swapAmount, setSwapAmount] = useState("0");


    // ============================================================== 
    // FUNCTIONS FOR READING FROM CONTRACT
    // ==============================================================

    const getSwapReturnAmount = async (swapAmountWei, swapDirectionEthToToken) => {
        try {
            const provider = await getProviderOrSigner();
            const exchangeContract = getExchangeContractInstance(provider);
            const response = await exchangeContract.getReserves();
            const cEthReserve = response[0];
            const cTokenReserve = response[1];
            const returnAmount = zero;
            if (swapDirectionEthToToken == 'true') {
                const returnResponse = await exchangeContract.getSwapAmount(swapAmountWei, cEthReserve, cTokenReserve);
                returnAmount = returnResponse[0];
            }
            else {
                const returnResponse = await exchangeContract.getSwapAmount(swapAmountWei, cTokenReserve, cEthReserve);
                returnAmount = returnResponse[0];
            }
            return returnAmount;
        }
        catch (err) {
            console.error(err);
        }
    }

    // ============================================================== 
    // FUNCTIONS FOR WRITE CONTRACT INTERACTIONS
    // ============================================================== 
    /**
     * approveAndAddLiquidity: Get token approval and add liquidity
     */
    const swapTokens = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const exchangeContract = getExchangeContractInstance(signer);
            const stakingContract = getStakingContractInstance(signer);
            const swapAmountWei = utils.parseEther(swapAmount).toString();
            const swapReturnAmountWei = await getSwapReturnAmount(swapAmountWei, swapDirectionEthToToken)
            if (swapDirectionEthToToken == 'true') {
                const swap_tx1 = await exchangeContract.swapEthForToken(swapReturnAmountWei.sub(1000).toString(), { value: swapAmountWei });
                setLoading(true);
                await swap_tx1.wait();
                setLoading(false);
            }
            else {
                const approve_tx = await stakingContract.approve(EXCHANGE_CONTRACT_ADDRESS, swapAmountWei);
                setLoading(true);
                await approve_tx.wait();
                const swap_tx2 = await exchangeContract.swapTokenForEth(swapAmountWei, swapReturnAmountWei.sub(1000).toString());
                await swap_tx2.wait();
                setLoading(false);
            }
            window.alert("Congrats, you have swapped some tokens!");
            setSwapAmount("0");
        } catch (err) {
            console.error(err);
        }
    };

    // ============================================================== 
    // === END ======================================================  
    // ============================================================== 


    // ============================================================== 
    // FUNCTIONS TO RENDER HTML
    // ============================================================== 

    const renderSwap = () => {
        return (
            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >
                <FormControl sx={{ m: 1, px: 3, minWidth: 120 }} size="small">
                    <TextField
                        required
                        id="outlined-required"
                        label="Swap amount"
                        type="number"
                        onChange={(e) => setSwapAmount(e.target.value || "0")}
                        onChange={async (e) => {
                            if (e.target.value) {
                                setSwapAmount(e.target.value || "0")
                                const swapAmountWei = utils.parseEther(e.target.value).toString()
                                const swapReturnAmountWei = await getSwapReturnAmount(swapAmountWei, swapDirectionEthToToken)
                                setSwapReceiveAmount(swapReturnAmountWei)
                            }
                        }}
                        defaultValue="0"
                    />
                </FormControl>
                <ToggleButtonGroup
                    sx={{ m: 2, minWidth: 120 }}
                    color="primary"
                    value={swapDirectionEthToToken}
                    exclusive
                    onChange={handleChange}
                >
                    <ToggleButton value="true">Swap ETH -> reward token</ToggleButton>
                    <ToggleButton value="false">Swap reward token -> ETH</ToggleButton>
                </ToggleButtonGroup>
                <div className={styles.description}>
                    You will receive {utils.formatEther(swapReceiveAmount.sub(swapReceiveAmount.mod(1e15)))} {swapDirectionEthToToken == 'true' ? "reward token(s)" : "ether(s)"} from the swap!
                </div>
                <FormControl sx={{ m: 1, px: 50, minWidth: 120 }} size="small">
                    <LoadingButton onClick={swapTokens} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content">
                        Swap tokens! 💱
                    </LoadingButton>
                </FormControl>
            </Box>
        );
    }


    // ============================================================== 
    // === END ======================================================  
    // ============================================================== 

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
            // getBalances();

            // // // set an interval to run these every 5 seconds
            // setInterval(async function () {
            //     await getBalances();
            // }, 5 * 1000);
        }
    }, [walletConnected]);

    return (
        <div>
            {ResponsiveAppBar()}
            <Head>
                <title>Random SVG NFT provide liquidity</title>
                <meta name="description" content="random-svg-nft-provide-liquidity" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Container maxWidth="xl">
                <div className={styles.main}>
                    <h1 className={styles.title}>Provide liquidity for ether and reward token swap!</h1>
                    {renderSwap()}
                </div>
            </Container >

            <footer className={styles.footer}>
                Made with &#10084; by SL
            </footer>
        </div >
    );
}