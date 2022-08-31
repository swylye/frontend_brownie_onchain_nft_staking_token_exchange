import { Contract, providers, utils, BigNumber } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { getNftContractInstance, getStakingContractInstance, getExchangeContractInstance } from "../utils/helperFunctions"
import LoadingButton from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import { EXCHANGE_CONTRACT_ADDRESS } from "../constants";

export default function Home() {
    // walletConnected keep track of whether the user's wallet is connected or not
    const [walletConnected, setWalletConnected] = useState(false);
    // loading is set to true when we are waiting for a transaction to get mined
    const [loading, setLoading] = useState(false);
    // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
    const web3ModalRef = useRef();

    const zero = BigNumber.from(0);

    const [userEthBalance, setUserEthBalance] = useState(zero);
    const [userTokenBalance, setUserTokenBalance] = useState(zero);
    const [userLpBalance, setUserLpBalance] = useState(zero);
    const [contractEthReserve, setContractEthReserve] = useState(zero);
    const [contractTokenReserve, setContractTokenReserve] = useState(zero);

    // If from user input, these would be in ETH (not wei), so conversion needed before passing them into function
    const [addEthAmount, setAddEthAmount] = useState("0");
    // const [addTokenAmount, setAddTokenAmount] = useState("0");
    const [addTokenAmountWei, setAddTokenAmountWei] = useState("0");
    const [removeLpAmount, setRemoveLpAmount] = useState("0");

    const [ethReturnAmount, setEthReturnAmount] = useState(zero);
    const [tokenReturnAmount, setTokenReturnAmount] = useState(zero);


    // ============================================================== 
    // FUNCTIONS FOR READING FROM CONTRACT
    // ==============================================================
    const getBalances = async () => {
        try {
            const provider = await getProviderOrSigner();
            const signer = await getProviderOrSigner(true);
            const address = await signer.getAddress();
            const stakingContract = getStakingContractInstance(signer);
            const exchangeContract = getExchangeContractInstance(signer);
            const uEthBalance = await provider.getBalance(address);
            const uTokenBalance = await stakingContract.balanceOf(address);
            const uLpBalance = await exchangeContract.balanceOf(address);
            const response = await exchangeContract.getReserves();
            const cEthReserve = response[0];
            const cTokenReserve = response[1];
            setUserEthBalance(uEthBalance);
            setUserTokenBalance(uTokenBalance);
            setUserLpBalance(uLpBalance);
            setContractEthReserve(cEthReserve);
            setContractTokenReserve(cTokenReserve);
        }
        catch (err) {
            console.error(err);
        }
    }

    const tokenAmountToAddPL = async (_addEtherAmount = "0") => {
        const addEthAmountWei = utils.parseEther(_addEtherAmount);
        const tokenAmountWei = addEthAmountWei.mul(contractTokenReserve).div(contractEthReserve);
        return tokenAmountWei;
    }

    const tokenAmountAfterRemoval = async () => {
        try {
            const provider = await getProviderOrSigner();
            const exchangeContract = getExchangeContractInstance(provider);
            const removeLpAmountWei = utils.parseEther(removeLpAmount);
            const lpTokenSupply = await exchangeContract.totalSupply();
            const calEthReturnAmount = removeLpAmountWei.mul(contractEthReserve).div(lpTokenSupply);
            const calTokenReturnAmount = removeLpAmountWei.mul(contractTokenReserve).div(lpTokenSupply);
            setEthReturnAmount(calEthReturnAmount);
            setTokenReturnAmount(calTokenReturnAmount);
        } catch (err) {
            console.error(err);
        }
    }
    // ============================================================== 
    // === END ======================================================  
    // ============================================================== 

    // ============================================================== 
    // FUNCTIONS FOR WRITE CONTRACT INTERACTIONS
    // ============================================================== 
    /**
     * approveAndAddLiquidity: Get token approval and add liquidity
     */
    const approveAndAddLiquidity = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const stakingContract = getStakingContractInstance(signer);
            const exchangeContract = getExchangeContractInstance(signer);
            await getBalances();
            const addEthAmountWei = utils.parseEther(addEthAmount).toString();
            const approve_tx = await stakingContract.approve(EXCHANGE_CONTRACT_ADDRESS, addTokenAmountWei);
            setLoading(true);
            await approve_tx.wait();
            const add_tx = await exchangeContract.addLiquidity(addTokenAmountWei, { value: addEthAmountWei });
            await add_tx.wait();
            setLoading(false);
            window.alert("Congrats, you have added liquidity!");
            setAddTokenAmountWei("0");
            setAddEthAmount("0");
            await getBalances();
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * removeLiquidity: Remove liquidity
     */
    const removeLiquidity = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const exchangeContract = getExchangeContractInstance(signer);
            const removeLpAmountWei = utils.parseEther(removeLpAmount);
            const remove_tx = await exchangeContract.removeLiquidity(removeLpAmountWei);
            setLoading(true);
            await remove_tx.wait();
            setLoading(false);
            window.alert("You have successfully removed liquidity!");
            setRemoveLpAmount("0");
            await getBalances();
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

    const renderAddLiquidity = () => {
        return (
            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >
                {!utils.parseEther(contractTokenReserve.toString()).eq(zero) ?
                    (
                        <div>
                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                <TextField
                                    required
                                    id="outlined-required"
                                    label="ETH Amount"
                                    type="number"
                                    onChange={async (e) => {
                                        setAddEthAmount(e.target.value || "0")
                                        const _tokenAmountWei = await tokenAmountToAddPL(e.target.value || "0")
                                        setAddTokenAmountWei(_tokenAmountWei)
                                    }}
                                    defaultValue="0"
                                />
                            </FormControl>
                            <FormControl sx={{ m: 3, minWidth: 120 }} size="small">
                                <LoadingButton onClick={approveAndAddLiquidity} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={userEthBalance <= 0 || userTokenBalance <= 0 ? true : false}>
                                    Provide liquidity! 💧
                                </LoadingButton>
                            </FormControl>
                        </div>
                    ) :
                    (
                        <div>
                            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                <TextField
                                    required
                                    id="outlined-required"
                                    label="ETH Amount"
                                    type="number"
                                    onChange={(e) => setAddEthAmount(e.target.value || "0")}
                                    defaultValue="0"
                                />
                                <TextField
                                    required
                                    id="outlined-required"
                                    label="Token Amount"
                                    type="number"
                                    onChange={(e) => setAddTokenAmountWei(utils.parseEther(e.target.value).toString() || "0")}
                                    defaultValue="0"
                                />
                            </FormControl>
                            <FormControl sx={{ m: 8, minWidth: 120 }} size="small">
                                <LoadingButton onClick={approveAndAddLiquidity} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content"
                                    disabled={userEthBalance <= 0 || userTokenBalance <= 0 ? true : false}>
                                    Provide liquidity! 💧
                                </LoadingButton>
                            </FormControl>
                        </div>
                    )
                }
            </Box >
        );
    }


    <div>
        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <TextField
                required
                id="outlined-required"
                label="ETH Amount"
                type="number"
                onChange={async (e) => {
                    setAddEthAmount(e.target.value || "0")
                    const _tokenAmountWei = await tokenAmountToAddPL(e.target.value || "0")
                    setAddTokenAmountWei(_tokenAmountWei)
                }}
                defaultValue="0"
            />
        </FormControl>
        <FormControl sx={{ m: 3, minWidth: 120 }} size="small">
            <LoadingButton onClick={approveAndAddLiquidity} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={userEthBalance <= 0 || userTokenBalance <= 0 ? true : false}>
                Provide liquidity! 💧
            </LoadingButton>
        </FormControl>
    </div>


    const renderRemoveLiquidity = () => {
        return (
            <Box
                component="form"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
            >
                <div>
                    <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                        <TextField
                            required
                            id="outlined-required"
                            label="LP Token Amount"
                            type="number"
                            onChange={async (e) => {
                                if (e.target.value) {
                                    setRemoveLpAmount(e.target.value || "0")
                                }
                            }}
                            defaultValue="0"
                        />
                    </FormControl>
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'background.default',
                            gridTemplateColumns: { md: '1fr 1fr' },
                            gap: 2,
                        }}
                    >
                        {ethReturnAmount > 0 || tokenReturnAmount > 0 ?
                            <div> You would receive {utils.formatEther(ethReturnAmount.sub(ethReturnAmount.mod(1e15)))} of ether(s) and {utils.formatEther(tokenReturnAmount.sub(tokenReturnAmount.mod(1e15)))} of reward token(s) back! </div>
                            : <div></div>}
                    </Box>
                    <FormControl sx={{ m: 3, minWidth: 120 }} size="small">
                        <LoadingButton onClick={removeLiquidity} loading={loading} loadingIndicator="Loading.." variant="contained" width="fit-content" disabled={userLpBalance < 0.02 ? true : false}>
                            Remove liquidity! 🔥
                        </LoadingButton>
                    </FormControl>
                </div>
            </Box >
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

    // update eth and token amount to be received whenever removal amount get's updated
    useEffect(() => {
        if (Number(removeLpAmount) > 0) {
            tokenAmountAfterRemoval()
        }
        else {
            setEthReturnAmount(zero);
            setTokenReturnAmount(zero);
        }
    }, [removeLpAmount])

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
            getBalances();

            // // set an interval to run these every 5 seconds
            setInterval(async function () {
                await getBalances();
            }, 5 * 1000);
        }
    }, [walletConnected]);

    return (
        <div>
            <Head>
                <title>Random SVG NFT provide liquidity</title>
                <meta name="description" content="random-svg-nft-provide-liquidity" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Container maxWidth="xl">
                <div className={styles.main}>
                    <h1 className={styles.title}>Provide liquidity for ether and reward token swap!</h1>
                    <Grid container spacing={2}>
                        <Grid item xs={6} md={6} className={styles.description}>
                            <h3>Your balances:</h3>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary={utils.formatEther(userEthBalance.sub(userEthBalance.mod(1e15))) + " ether(s)"}
                                        secondary={null}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary={utils.formatEther(userTokenBalance.sub(userTokenBalance.mod(1e15))) + " reward token(s)"}
                                        secondary={null}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary={utils.formatEther(userLpBalance.sub(userLpBalance.mod(1e15))) + " LP token(s)"}
                                        secondary={null}
                                    />
                                </ListItem>
                            </List>
                        </Grid>
                        <Grid item xs={6} md={6} className={styles.description}>
                            <h3>Add/ Remove liquidity:</h3>
                            <div>
                                {renderAddLiquidity()}
                            </div>
                            <hr />
                            <div>
                                {renderRemoveLiquidity()}
                            </div>
                        </Grid>
                    </Grid>
                </div>
            </Container >
        </div >
    );
}