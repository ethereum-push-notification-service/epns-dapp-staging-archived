import React, { useState, useRef, useEffect } from "react";
import styled, { css, useTheme } from "styled-components";
import Dropdown from "react-dropdown";
import "react-dropdown/style.css";
import {
  Section,
  Content,
  Item,
  ItemH,
  H2,
  H3,
  Span,
  Button,
  FormSubmision,
  Input,
  TextField,
} from "../primaries/SharedStyling";
import { FiLink } from "react-icons/fi";
import "react-dropzone-uploader/dist/styles.css";
import Loader from "react-loader-spinner";

import { envConfig } from "@project/contracts";

import { useWeb3React } from "@web3-react/core";
import { ThemeProvider } from "styled-components";
import { addresses, abis } from "@project/contracts";
import ImageClipper from "../primaries/ImageClipper";
import { ReactComponent as ImageIcon } from "../assets/Image.svg";
import "./createChannel.css";

const ethers = require("ethers");

const minStakeFees = 50;
const ALIAS_CHAINS = [
  { value: "Ethereum", label: "Ethereum" },
  { value: "POLYGON_TEST_MUMBAI:80001", label: "Polygon" },
];

const networkName = {
  42: "Ethereum Kovan",
  1: "Ethereum Mainnet"
}

const CORE_CHAIN_ID = envConfig.coreContractChain;

// Create Header
function CreateChannel() {
  const { account, library, chainId } = useWeb3React();

  const themes = useTheme();

  const onCoreNetwork = CORE_CHAIN_ID === chainId;

  const [processing, setProcessing] = React.useState(0);
  const [processingInfo, setProcessingInfo] = React.useState("");

  const [uploadDone, setUploadDone] = React.useState(false);
  const [stakeFeesChoosen, setStakeFeesChoosen] = React.useState(false);
  const [channelInfoDone, setChannelInfoDone] = React.useState(false);

  const [chainDetails, setChainDetails] = React.useState("Ethereum");
  const [channelName, setChannelName] = React.useState("");
  const [channelAlias, setChannelAlias] = React.useState("");
  const [channelInfo, setChannelInfo] = React.useState("");
  const [channelURL, setChannelURL] = React.useState("");
  const [channelFile, setChannelFile] = React.useState(undefined);
  const [channelStakeFees, setChannelStakeFees] = React.useState(minStakeFees);
  const [daiAmountVal, setDaiAmountVal] = useState("");
  const [txStatus, setTxStatus] = useState(2);

  //image upload states
  const childRef = useRef();
  const [view, setView] = useState(false);
  const [final, setFinal] = useState(false);
  const [imageSrc, setImageSrc] = useState(undefined);
  const [croppedImage, setCroppedImage] = useState(undefined);

  const [stepFlow, setStepFlow] = React.useState(1);

  //checking DAI for user
  React.useEffect(() => {
    if (!onCoreNetwork) return;
    const checkDaiFunc = async () => {
      let checkDaiAmount = new ethers.Contract(
        addresses.dai,
        abis.dai,
        library
      );

      let value = await checkDaiAmount.allowance(account, addresses.epnscore);
      value = value?.toString();
      const convertedVal = ethers.utils.formatEther(value);
      setDaiAmountVal(convertedVal);
      if (convertedVal >= 50.0) {
        setChannelStakeFees(convertedVal);
      }
    };
    checkDaiFunc();
  }, []);

  const proceed = () => {
    setStepFlow(2);
    setProcessing(0);
    setUploadDone(true);
    console.log(channelFile);
  };

  const handleLogoSizeLimitation = (base64) => {
    // Setup Error on higher size of 128px
    var sizeOf = require("image-size");
    var base64Data = base64.split(";base64,").pop();
    var img = Buffer.from(base64Data, "base64");
    var dimensions = sizeOf(img);

    // Only proceed if image is equal to or less than 128
    if (dimensions.width > 128 || dimensions.height > 128) {
      console.log("Image size check failed... returning");
      return {
        success: 0,
        info: "Image size check failed, Image should be 128X128PX",
      };
    }

    let fileext;
    console.log(base64Data.charAt(0));
    if (base64Data.charAt(0) == "/") {
      return {
        success: 1,
        info: "Image checks passed",
      };
    } else if (base64Data.charAt(0) == "i") {
      return {
        success: 1,
        info: "Image checks passed",
      };
    } else {
      return {
        success: 0,
        info: "Image extension should be jpg or png",
      };
    }
  };

  const handleCreateChannel = async (e) => {
    // Check everything in order
    // skip this for now

    e.preventDefault();

    if (
      isEmpty(channelName) ||
      isEmpty(channelInfo) ||
      isEmpty(channelURL) ||
      isEmpty(channelFile) ||
      channelAlias
        ? isEmpty(chainDetails)
        : chainDetails
        ? chainDetails == "Ethereum"
          ? false
          : isEmpty(channelAlias)
        : false
    ) {
      setProcessing(3);
      setProcessingInfo("Channel Fields are Empty! Please retry!");

      return false;
    }

    // Check complete, start logic
    setChannelInfoDone(true);
    setProcessing(1);

    console.log({
      chainDetails,
      channelAlias,
    });
    var chainDetailsSplit = chainDetails.split(":");
    var blockchain = chainDetailsSplit[0];
    var chain_id = chainDetailsSplit[1];
    var address = channelAlias;

    let input = {
      name: channelName,
      info: channelInfo,
      url: channelURL,
      icon: channelFile,
      blockchain: blockchain,
      chain_id: chain_id,
      address: address,
    };

    if (blockchain == "Ethereum") {
      input.blockchain = "";
    }

    input = JSON.stringify(input);

    console.log(`input is ${input}`);
    const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");

    setProcessingInfo("Uploading Payload...");
    var storagePointer = (storagePointer = await ipfs.add(input));
    console.log("IPFS storagePointer:", storagePointer);
    setProcessingInfo("Payload Uploaded, Approval to transfer DAI...");
    //console.log(await ipfs.cat(storagePointer));

    // Send Transaction
    // First Approve DAI
    var signer = library.getSigner(account);

    let daiContract = new ethers.Contract(addresses.dai, abis.erc20, signer);

    // Pick between 50 DAI AND 25K DAI
    const fees = ethers.utils.parseUnits(channelStakeFees.toString(), 18);

    if(daiAmountVal < 50.0){
      var sendTransactionPromise = daiContract.approve(addresses.epnscore, fees);
      const tx = await sendTransactionPromise;
  
      console.log(tx);
      console.log("waiting for tx to finish");
      setProcessingInfo("Waiting for Approval TX to finish...");
      await library.waitForTransaction(tx.hash);
    }

    let contract = new ethers.Contract(
      addresses.epnscore,
      abis.epnscore,
      signer
    );

    const channelType = 2; // Open Channel
    const identity = "1+" + storagePointer; // IPFS Storage Type and HASH
    const identityBytes = ethers.utils.toUtf8Bytes(identity);

    var anotherSendTxPromise = contract.createChannelWithFees(
      channelType,
      identityBytes,
      fees,
      {
        gasLimit: 1000000,
      }
    );

    setProcessingInfo("Creating Channel TX in progress");
    anotherSendTxPromise
      .then(async function(tx) {
        console.log(tx);
        console.log("Check: " + account);
        let txCheck = await library.waitForTransaction(tx.hash);

        if(txCheck.status === 0){
          setProcessing(3);
          setTxStatus(0);
          setProcessingInfo("Transaction Failed due to some error! Try again");
          setTimeout(() => {
            setProcessing(0);
            setTxStatus(2);
            setChannelInfoDone(false);
          }, 10000);
        }
        else {
          setProcessing(3);
          setProcessingInfo("Channel Created! Reloading...");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      })
      .catch((err) => {
        console.log("Error --> %o", err);
        console.log({ err });
        setProcessing(3);
        setProcessingInfo(
          "!!!PRODUCTION ENV!!! Contact support@epns.io to whitelist your wallet"
        );
      });
  };

  const isEmpty = (field) => {
    if (field.trim().length == 0) {
      return true;
    }

    return false;
  };

  //mind Dai
  const mintDai = async () => {
    try {
      var signer = library.getSigner(account);
      let daiContract = new ethers.Contract(addresses.dai, abis.dai, signer);
      console.log({
        daiContract,
      });
      console.log(1);
      let daiAmount = 1000;
      const amount = ethers.utils.parseUnits(daiAmount.toString(), 18);
      console.log(2);
      var mintTransactionPromise = daiContract.mint(amount);
      console.log(3);
      const tx = await mintTransactionPromise;
      console.log(tx);
      await library.waitForTransaction(tx.hash);
      console.log(4);
      setProcessingInfo("1000 Dai minted successfully!");
      console.log("Transaction Completed");
    } catch (err) {
      console.log(err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleOnDrop = (e) => {
    //prevent the browser from opening the image
    e.preventDefault();
    e.stopPropagation();
    //let's grab the image file
    handleFile(e.dataTransfer, "transfer");
  };

  const handleFile = async (file, path) => {
    setCroppedImage(undefined);
    setView(true);
    setFinal(false);

    //you can carry out any file validations here...
    if (file?.files[0]) {
      var reader = new FileReader();
      reader.readAsDataURL(file?.files[0]);

      reader.onloadend = function(e) {
        setImageSrc(reader.result);
      };
    } else {
      return "Nothing....";
    }
  };

  useEffect(() => {
    if (croppedImage) {
      toDataURL(croppedImage, function(dataUrl) {
        const response = handleLogoSizeLimitation(dataUrl);
        if (response.success) {
          setChannelFile(croppedImage);
        }
      });
    } else {
      return "Nothing";
    }
  }, [croppedImage]);

  function toDataURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
        callback(reader.result);
      };
      reader.readAsDataURL(xhr.response);
    };
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.send();
  }

  return (
    <ThemeProvider theme={themes}>
      <Section>
        <Content padding="10px 20px 20px">
          <Item align="flex-start">
            <H2 textTransform="uppercase" spacing="0.1em">
              <Span bg="#674c9f" color="#fff" weight="600" padding="0px 8px">
                Create
              </Span>
              <Span weight="200" color={themes.color}>
                {" "}
                Your Channel!
              </Span>
            </H2>
            <H3 color={themes.createColor}>
              <b color={themes.createColor}>
                Ethereum Push Notification Service
              </b>{" "}
              (EPNS) makes it extremely easy to open and maintain a genuine
              channel of communication with your users.
            </H3>
          </Item>
        </Content>
      </Section>

      {!onCoreNetwork ? (
        <>
          <Section>
            <Content padding="50px 20px 20px">
              <Item align="flex-start">
                <H3 color="#e20880" weight={700}>
                  Channels can only be created on {networkName[envConfig.coreContractChain]} Network and not on Alias chains. Please switch to {networkName[envConfig.coreContractChain]} Network to create a channel.
                </H3>
              </Item>
            </Content>
          </Section>
        </>
      ) : (
        <>
          <Section>
            <Content padding="0px 20px 20px">
              <ItemH justify="space-between">
                <Step
                  bg="#fff"
                  activeBG="#e20880"
                  type={stepFlow >= 1 ? "active" : "inactive"}
                />
                <Step
                  bg="#fff"
                  activeBG="#e20880"
                  type={stepFlow >= 2 ? "active" : "inactive"}
                />
                <Step
                  bg="#fff"
                  activeBG="#e20880"
                  type={stepFlow >= 3 ? "active" : "inactive"}
                />
                <Line />
              </ItemH>
            </Content>
          </Section>

          {/* Image Upload Section */}
          {!uploadDone && (
            <Section>
              <Content padding="50px 20px 20px">
                <Item align="flex-start">
                  <H3 color="#e20880" margin="0px 0px">
                    Upload Channel Logo to start the process. Clip image to
                    resize to 128x128px.
                  </H3>
                </Item>

                <Space className="">
                  <div>
                    <div
                      onDragOver={(e) => handleDragOver(e)}
                      onDrop={(e) => handleOnDrop(e)}
                      className="bordered"
                    >
                      <div className="inner">
                        {view ? (
                          <div className="crop-div">
                            {croppedImage ? (
                              <div>
                                <img
                                  alt="Cropped Img"
                                  src={croppedImage}
                                  className="croppedImage"
                                />
                              </div>
                            ) : (
                              <ImageClipper
                                className="cropper"
                                imageSrc={imageSrc}
                                onImageCropped={(croppedImage) =>
                                  setCroppedImage(croppedImage)
                                }
                                ref={childRef}
                              />
                            )}
                          </div>
                        ) : (
                          <ImageIcon />
                        )}

                        <ButtonSpace>
                          <div className="crop-button">
                            {view &&
                              (!croppedImage ? (
                                <Button
                                  bg="#1C4ED8"
                                  onClick={() => {
                                    childRef.current.showCroppedImage();
                                  }}
                                >
                                  Clip Image
                                </Button>
                              ) : (
                                <div className="crop-button">
                                  <Button
                                    bg="#1C4ED8"
                                    onClick={() => proceed()}
                                  >
                                    Next
                                  </Button>
                                </div>
                              ))}
                          </div>
                        </ButtonSpace>

                        <div className="text-div">
                          <label htmlFor="file-upload" className="labeled">
                            <div>Upload a file</div>
                            <input
                              id="file-upload"
                              accept="image/*"
                              name="file-upload"
                              hidden
                              onChange={(e) => handleFile(e.target, "target")}
                              type="file"
                              className="sr-only"
                              readOnly
                            />
                          </label>
                          <div className="">- or drag and drop</div>
                        </div>
                        <p className="text-below">
                          PNG, JPG.Proceed to clip and submit final
                        </p>
                      </div>
                    </div>
                  </div>
                </Space>

                {/* <Item margin="-10px 0px 20px 0px">
              <Dropzone
                onChangeStatus={handleChangeStatus}
                onSubmit={handleLogoSubmit}
                onDrop={onDropHandler}
                maxFiles={1}
                multiple={false}
                accept="image/jpeg,image/png"
              />
            </Item> */}
                {chainId != 1 || chainId != 137 ? (
                  <Item align="flex-end">
                    <Minter
                      onClick={() => {
                        mintDai();
                      }}
                    >
                      <Pool>
                        <br></br>
                        <PoolShare>Get Free DAI for Channel</PoolShare>
                      </Pool>
                    </Minter>
                  </Item>
                ) : (
                  <></>
                )}
              </Content>
            </Section>
          )}
 
          {/* Stake Fees Section */}
          {uploadDone && !stakeFeesChoosen && (
            <Section>
              <Content padding="50px 0px 0px 0px">
                {/* <Item align="flex-start" margin="0px 20px">
              <H3 color="#e20880">Set your staking fees in DAI</H3>
            </Item> */}

                <Item
                  margin="-10px 20px 20px 20px"
                  padding="20px 20px 10px 20px"
                  bg="#f1f1f1"
                >
                  {/* <Slider
                defaultValue={minStakeFees}
                onChangeCommitted={(event, value) => setChannelStakeFees(value)}
                aria-labelledby="discrete-slider"
                valueLabelDisplay="auto"
                step={minStakeFees}
                marks
                min={minStakeFees}
                max={25000}
              /> */}
                  <Span
                    weight="400"
                    size="1.0em"
                    textTransform="uppercase"
                    spacing="0.2em"
                  >
                    Amount Staked: {channelStakeFees} DAI
                  </Span>
                </Item>

                <Item self="stretch" align="stretch" margin="20px 0px 0px 0px">
                  <Button
                    bg="#e20880"
                    color="#fff"
                    flex="1"
                    radius="0px"
                    padding="20px 10px"
                    onClick={() => {
                      setStakeFeesChoosen(true);
                      setStepFlow(3);
                    }}
                  >
                    <Span
                      color="#fff"
                      weight="400"
                      textTransform="uppercase"
                      spacing="0.1em"
                    >
                      Continue
                    </Span>
                  </Button>
                </Item>
              </Content>
            </Section>
          )}

          {/* Channel Entry */}
          {uploadDone && stakeFeesChoosen && !channelInfoDone && (
            <Section>
              <Content padding="50px 0px 0px 0px">
                <Item align="flex-start" margin="0px 20px">
                  <H3 color="#e20880">Setup your Channel Info</H3>
                </Item>

                <FormSubmision
                  flex="1"
                  direction="column"
                  margin="0px"
                  justify="center"
                  size="1.1rem"
                  onSubmit={handleCreateChannel}
                >
                  <Item
                    margin="-10px 20px 15px 20px"
                    flex="1"
                    self="stretch"
                    align="stretch"
                  >
                    <InputDiv border="1px solid black">
                      <Input
                        required
                        placeholder="Your Channel Name"
                        maxlength="40"
                        maxllength="100%"
                        padding="12px"
                        weight="400"
                        size="1em"
                        bg="#fff"
                        value={channelName}
                        onChange={(e) => {
                          setChannelName(e.target.value);
                        }}
                      />
                    </InputDiv>

                    {channelName.trim().length == 0 && (
                      <Span
                        padding="4px 10px"
                        right="0px"
                        top="0px"
                        pos="absolute"
                        color="#fff"
                        bg="#000"
                        size="0.7rem"
                        z="1"
                      >
                        Channel's Name
                      </Span>
                    )}
                  </Item>

                  <Item
                    margin="15px 20px 15px 20px"
                    flex="1"
                    self="stretch"
                    align="stretch"
                    direction="row"
                    height="20px"
                    style={{ position: "relative" }}
                  >
                    
                    {/* dropdown */}
                    <DropdownStyledParent>
                      <DropdownStyled
                        options={ALIAS_CHAINS}
                        onChange={(option) => {
                            setChainDetails(option.value);
                            console.log(option);
                        }}
                        value={chainDetails}
                      />
                    </DropdownStyledParent>

                    <span
                      className="imgSpan"
                      data-tooltip="When sending notifications to Non-Ethereum Chains, the Channel Alias address will act as a native representation of your Channel on that blockchain."
                    >
                      <img
                        className="iImage"
                        src="/svg/info.svg"
                        style={{
                          width: "20px",
                          height: "20px",
                          marginTop: "0px",
                          marginBottom: "-2px",
                        }}
                      />

                      {/* <span className="test">When sending notifications to Non-Ethereum Chains, the Channel Alias address will act as a native representation of your channel on that Blockchain <a href="">read more</a></span> */}
                      </span>
                      <Span
                        padding="4px 10px"
                        right="0px"
                        top="0px"
                        pos="absolute"
                        color="#fff"
                        bg="#000"
                        size="0.7rem"
                        z="1"
                      >
                        Choose Channel's Activation Network
                      </Span>

                  </Item>
                    
                    {chainDetails != "Ethereum" &&
                    <Item
                      margin="55px 20px 15px 20px"
                      flex="1"
                      self="stretch"
                      align="stretch"
                      style={{ position: "relative" }}
                    >
                      <InputDiv
                        border={() => {
                          if (themes.scheme == "dark") return "1px solid white";
                          else return "1px solid black";
                        }}
                      >
                        <Input
                          placeholder="Your Channel's Alias address"
                          maxlength="40"
                          maxllength="100%"
                          padding="12px"
                          weight="400"
                          size="1rem"
                          bg="white"
                          disabled={
                            chainDetails === "" || chainDetails === "Ethereum"
                              ? true
                              : false
                          }
                          visibility={
                            chainDetails === "Ethereum" ? "hidden" : "visible"
                          }
                          value={channelAlias}
                          onChange={(e) => {
                            setChannelAlias(e.target.value);
                          }}
                        />
                      </InputDiv>
                      <Span
                        padding="4px 10px"
                        right="0px"
                        top="0px"
                        pos="absolute"
                        color="#fff"
                        bg="#000"
                        size="0.7rem"
                      >
                        Make sure you own this address as verification will take place.
                      </Span>
                    </Item>
                    }

                  <Item
                    margin="0px 20px 15px 20px"
                    flex="1"
                    self="stretch"
                    align="stretch"
                    style={{marginTop: `${chainDetails === "Ethereum" ? "55px" : "20px"}`, position: "relative"}}
                  >
                    <TextField
                      required
                      placeholder="Your Channel's Short Description (250 Characters)"
                      rows="4"
                      maxlength="250"
                      radius="4px"
                      padding="12px"
                      weight="400"
                      border="1px solid #000"
                      bg="#fff"
                      value={channelInfo}
                      onChange={(e) => {
                        setChannelInfo(e.target.value.slice(0, 250));
                      }}
                      autocomplete="off"
                    />

                    <SpanR>
                      <span
                        style={{padding: "15px"}}
                      >
                        {250 - channelInfo.length} characters remains
                      </span>
                    </SpanR>
                    <Span
                        padding="4px 10px"
                        right="0px"
                        top="0px"
                        pos="absolute"
                        color="#fff"
                        bg="#000"
                        size="0.7rem"
                      >
                        Channel's Description
                      </Span>
                  </Item>

                  <ItemH
                    margin="15px 20px 15px 20px"
                    flex="1"
                    self="stretch"
                    align="center"
                  >
                    <Item flex="0" margin="0px 5px 0px 0px">
                      <FiLink size={24} color={themes.color} />
                    </Item>
                    <Item flex="1" margin="0px 0px 0px 5px" align="stretch">
                      <Input
                        required
                        placeholder="Call to Action Link"
                        padding="12px"
                        border="1px solid #000"
                        radius="4px"
                        weight="400"
                        bg="#f1f1f1"
                        value={channelURL}
                        onChange={(e) => {
                          setChannelURL(e.target.value);
                        }}
                      />
                      {channelURL.trim().length == 0 && (
                        <Span
                          padding="4px 10px"
                          right="0px"
                          top="0px"
                          pos="absolute"
                          color="#fff"
                          bg="#000"
                          size="0.7rem"
                          z="1"
                        >
                          Channel's Website URL
                        </Span>
                      )}
                    </Item>
                  </ItemH>

                  <Item
                    margin="15px 0px 0px 0px"
                    flex="1"
                    self="stretch"
                    align="stretch"
                  >
                    <Button
                      bg="#e20880"
                      color="#fff"
                      flex="1"
                      radius="0px"
                      padding="20px 10px"
                      disabled={processing == 1 ? true : false}
                    >
                      {processing == 1 && (
                        <Loader
                          type="Oval"
                          color="#fff"
                          height={24}
                          width={24}
                        />
                      )}
                      {processing != 1 && (
                        <Input
                          cursor="hand"
                          textTransform="uppercase"
                          color="#fff"
                          weight="400"
                          size="0.8em"
                          spacing="0.2em"
                          type="submit"
                          value="Setup Channel"
                        />
                      )}
                    </Button>
                  </Item>
                </FormSubmision>
              </Content>
            </Section>
          )}

          {/* Channel Setup Progress */}
          {(processing == 1 || processing == 3) && (
            <Section>
              <Content padding="0px 0px 0px 0px">
                {processing == 1 && (
                  <Item margin="20px 0px 10px 0px">
                    <Loader type="Oval" color="#000" height={24} width={24} />
                  </Item>
                )}

                <Item
                  color="#fff"
                  bg={processing == 1 ? "#e1087f" : "#000"}
                  padding="10px 15px"
                  margin="15px 0px"
                >
                  <Span
                    color="#fff"
                    textTransform="uppercase"
                    spacing="0.1em"
                    weight="400"
                    size="1em"
                  >
                    {processingInfo}
                    {txStatus === 0 &&
                      <div
                        style={{
                          textTransform: "none",
                          padding: "10px 0px"
                        }}
                      >
                        <div style={{paddingBottom: "5px"}}>It may be possible due to one of the following reasons:</div>
                        <div>1. There is not enough DAI in your wallet.</div>
                        <div>2. Network may be congested, due to that gas price increased. Try by increasing gas limit manually.</div> 
                      </div>
                    }  
                  </Span>
                </Item>
              </Content>
            </Section>
          )}
        </>
      )}
    </ThemeProvider>
  );
}

// css styles

const InputDiv = styled.div`
  display: ${(props) => props.display || "flex"};
  flex: 1;
  border: ${(props) => props.border || "none"};
  margin-bottom: ${(props) => props.marginBottom || "none"};
  width: ${(props) => props.width || "none"};
  visibility: ${(props) => props.visibility || ""};
`;
const SpanR = styled.div`
  position: absolute;
  bottom: 0px;
  right: 0.8rem;
  color: white;
  z-index: 1;
  margin-bottom: 5px;
  padding: 5px;
  background: #e20880;
  border-radius: 20px;
  align-items: center;
  font-size: 16px;
`;
const Step = styled.div`
  height: 12px;
  width: 12px;
  background: ${(props) => props.bg || "#fff"};
  border: 4px solid ${(props) => props.activeBG || "#000"};
  border-radius: 100%;

  ${({ type }) =>
    type == "active" &&
    css`
      background: ${(props) => props.activeBG || "#ddd"};
      border: 4px solid #00000022;
    `};
`;

const Line = styled.div`
  position: absolute;
  height: 5px;
  background: #f1f1f1;
  right: 0;
  left: 0;
  margin: 0px 10px;
  z-index: -1;
`;

const Info = styled.label`
  padding-bottom: 20px;
  font-size: 14px;
  color: #000;
`;

const Minter = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 13px;
`;

const ChannelMetaBox = styled.label`
  margin: 0px 5px;
  color: #fff;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 15px;
  // font-size: 11px;
`;
const Pool = styled.div`
  margin: 0px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PoolShare = styled(ChannelMetaBox)`
  background: #e20880;
  // background: #674c9f;
`;

const ButtonSpace = styled.div`
  width: 40%;
  align-items: center;
  margin: 1rem auto;
`;

const Space = styled.div`
  width: 100%;
  margin-bottom: 2rem;
  .bordered {
    display: flex;
    justify-content: center;
    border: 4px dotted #ccc;
    border-radius: 10px;
    padding: 6px;
    margin-top: 10px;
    .inner {
      margin-top: 0.25rem;
      text-align: center;
      padding: 10px;
      width: 100%;
      .crop-div {
        width: 100%;
        display: flex;
        flex-direction: row;
        @media (max-width: 768px) {
          flex-direction: column;
        }
        justify-content: space-evenly;
        align-items: center;
        margin-right: auto;
        div {
          .croppedImage {
            @media (max-width: 768px) {
              margin-top: 1rem;
            }
          }
        }
        .cropper {
          width: 250px;
          height: 250px;
        }
      }
      .check-space {
        .croppedImage {
          width: auto;
          height: auto;
          border-radius: 5px;
        }
        .button-space {
          margin-top: 1rem;
          width: 100%;
          display: flex;
          justify-content: center;
        }
      }
      .crop-button {
        display: flex;
        justify-content: center;
        width: 100%;
        @media (max-width: 768px) {
          margin-top: 1rem;
        }
      }
      .svg {
        margin: 0px auto;
        height: 3rem;
        width: 3rem;
        color: #ccc;
      }
      .text-div {
        display: flex;
        font-size: 1rem;
        line-height: 1rem;
        margin-top: 0.2rem;
        color: #ccc;
        justify-content: center;
        .labeled {
          position: relative;
          cursor: pointer;
          background-color: white;
          border-radius: 4px;
          color: #60a5fa;
        }
      }
      .text-below {
        font-size: 1rem;
        line-height: 1rem;
        color: #ccc;
        margin-top: 0.3rem;
      }
    }
  }
  .image-error {
    font-size: 1rem;
    line-height: 1rem;
    color: red;
    margin-top: 0.5rem;
  }
  .image {
    margin-top: 1rem;
    display: flex;
    flex-direction: row;
    .item {
      width: 4rem;
      height: auto;
      border-radius: 4px;
    }
    .image-border {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      margin-left: 2rem;
      .text {
        font-size: 1rem;
        line-height: 1rem;
        color: #ccc;
        margin-top: 1rem;
      }
    }
  }
`;

const Field = styled.div`
  margin: 20px 0px 5px 0px;
  color: #4b5563;
  font-size: small;
  text-transform: uppercase;
`;

const DropdownStyledParent = styled.div`
flex:1;
.is-open {
    margin-bottom: 130px;
}
`

const DropdownStyled = styled(Dropdown)`
  .Dropdown-control {
      background-color: #fff;
      color: #000;
      border: 1px solid black;
      width:100%;
      outline: none;
      height: 59px;
      display: flex;
      align-items: center;
  }
  .Dropdown-arrow {
      top: 30px;
      bottom: 0;
      border-color: #f #000 #000;
  }
  .Dropdown-menu {
    border-color: #000;
      .is-selected {
      background-color: #D00775;
      color:#fff;
    }
  }
 
  .Dropdown-option {
      background-color: #fff;
      color: #000;
  }
  .Dropdown-option:hover {
      background-color: #D00775;
      color: #000;
  }
  `;

export default CreateChannel;
