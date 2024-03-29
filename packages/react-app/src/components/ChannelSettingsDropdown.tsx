import React from "react";
import { useSelector, useDispatch } from "react-redux";
import styled, { css , useTheme } from "styled-components";
import { useWeb3React } from "@web3-react/core";
import { toast as toaster } from "react-toastify";
import { addresses, abis } from "@project/contracts";
import { postReq } from "api";

import { envConfig } from "@project/contracts";
import AddDelegateModal from "./AddDelegateModal";
import RemoveDelegateModal from "./RemoveDelegateModal";
import ActivateChannelModal from "./ActivateChannelModal";
import AddSubGraphIdModal from "./AddSubGraphIdModal";
import EPNSCoreHelper from "helpers/EPNSCoreHelper";
import { setUserChannelDetails } from "redux/slices/adminSlice";


import {
  AiOutlineUserAdd,
  AiOutlineUserDelete,
  AiTwotoneDelete,
  AiOutlineDropbox
} from 'react-icons/ai';

import "react-dropdown/style.css";
import "react-toastify/dist/ReactToastify.min.css";

import {Oval} from "react-loader-spinner";
const ethers = require("ethers");

const MIN_STAKE_FEES = 50;
const ALLOWED_CORE_NETWORK = envConfig.coreContractChain;

// Create Header
function ChannelSettings({props}) {
  const dispatch = useDispatch();
  const { account, library, chainId } = useWeb3React();
  const { epnsWriteProvider, epnsCommWriteProvider } = useSelector(
    (state: any) => state.contracts
  );
  const { channelDetails } = useSelector((state: any) => state.admin);
  const {
    CHANNNEL_DEACTIVATED_STATE,
    CHANNEL_BLOCKED_STATE,
    CHANNEL_ACTIVE_STATE,
  } = useSelector((state: any) => state.channels);

  const theme = useTheme();
  const { channelState } = channelDetails;
  const onCoreNetwork = ALLOWED_CORE_NETWORK === chainId;

  const [loading, setLoading] = React.useState(false);
  const [
    showActivateChannelPopup,
    setShowActivateChannelPopup,
  ] = React.useState(false);
  const [channelStakeFees, setChannelStakeFees] = React.useState(
    MIN_STAKE_FEES
  );
  const [poolContrib, setPoolContrib] = React.useState(0);
  const [addDelegateLoading, setAddDelegateLoading] = React.useState(false);
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [addSubGraphIdOpen, setAddSubGraphIdOpen] = React.useState(false);
  const [addSubgraphDetailsLoading, setAddSubgraphDetailsLoading] = React.useState(false);
  const [removeDelegateLoading, setRemoveDelegateLoading] = React.useState(
    false
  );
  const [removeModalOpen, setRemoveModalOpen] = React.useState(false);

  // toaster customize
  const LoaderToast = ({ msg, color }) => (
    <Toaster>
      <Oval color={color} height={30} width={30} />
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  );

  // Toastify
  let notificationToast = () =>
    toaster.dark(<LoaderToast msg="Preparing Notification" color="#fff" />, {
      position: "bottom-right",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });

  const isChannelDeactivated = channelState === CHANNNEL_DEACTIVATED_STATE;
  const isChannelBlocked = channelState === CHANNEL_BLOCKED_STATE;
  const channelInactive = isChannelBlocked || isChannelDeactivated;

  React.useEffect(() => {
    // To set channel info from a channel details
    // setChannelState(channelDetails.channelState);
    setPoolContrib(
      +EPNSCoreHelper.formatBigNumberToMetric(
        channelDetails.poolContribution,
        true
      )
    );
  }, [account, channelDetails.poolContribution]);

  const toggleChannelActivationState = () => {
    if (isChannelBlocked) return;
    if (isChannelDeactivated) {
      setShowActivateChannelPopup(true);
    } else {
      deactivateChannel();
    }
  };

  /**
   * Function to activate a channel that has been deactivated
   */
  const activateChannel = async () => {
    // First Approve DAI
    setLoading(true);
    var signer = library.getSigner(account);
    let daiContract = new ethers.Contract(addresses.dai, abis.erc20, signer);
    const fees = ethers.utils.parseUnits(channelStakeFees.toString(), 18);
    var sendTransactionPromise = daiContract.approve(addresses.epnscore, fees);
    const tx = await sendTransactionPromise;

    console.log(tx);
    console.log("waiting for tx to finish");

    await library.waitForTransaction(tx.hash);
    await epnsWriteProvider
      .reactivateChannel(fees)
      .then(async (tx: any) => {
        console.log(tx);
        console.log("Transaction Sent!");

        toaster.update(notificationToast(), {
          render: "Reactivating Channel",
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });

        await tx.wait(1);
        toaster.update(notificationToast(), {
          render: "Channel Reactivated",
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });
        dispatch(
          setUserChannelDetails({
            ...channelDetails,
            channelState: CHANNEL_ACTIVE_STATE,
          })
        );
      })
      .catch((err: any) => {
        console.log("!!!Error reactivateChannel() --> %o", err);
        toaster.update(notificationToast(), {
          render: "Transacion Failed: " + err.error?.message || err.message,
          type: toaster.TYPE.ERROR,
          autoClose: 5000,
        });
      })
      .finally(() => {
        setLoading(false);
        setShowActivateChannelPopup(false);
      });
  };

  /**
   * Function to deactivate a channel that has been deactivated
   */
  const deactivateChannel = async () => {
    setLoading(true);
    if (!poolContrib) return;

    const amountToBeConverted = parseInt("" + poolContrib) - 10;
    console.log("Amount To be converted==>", amountToBeConverted);

    const { data: response } = await postReq("/channels/getDaiToPush", {
      value: amountToBeConverted,
    });

    const pushValue = response.response.data.quote.PUSH.price;

    await epnsWriteProvider
      // .deactivateChannel(amountsOut.toString().replace(/0+$/, "")) //use this to remove trailing zeros 1232323200000000 -> 12323232
      .deactivateChannel(Math.floor(pushValue)) 
      .then(async (tx: any) => {
        console.log(tx);
        console.log("Transaction Sent!");

        toaster.update(notificationToast(), {
          render: "Transaction sending",
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });

        await tx.wait(1);
        console.log("Transaction Mined!");
        dispatch(
          setUserChannelDetails({
            ...channelDetails,
            channelState: CHANNNEL_DEACTIVATED_STATE,
          })
        );
      })
      .catch((err: any) => {
        console.log("!!!Error deactivateChannel() --> %o", err);
        console.log({
          err,
        });
        toaster.update(notificationToast(), {
          render: "Transacion Failed: " + err.error?.message || err,
          type: toaster.TYPE.ERROR,
          autoClose: 5000,
        });
      })
      .finally(() => {
        // post op
        setLoading(false);
      });
  };

  const addDelegate = async (walletAddress: string) => {
    setAddDelegateLoading(true);
    return epnsCommWriteProvider.addDelegate(walletAddress).finally(() => {
      setAddDelegateLoading(false);
    });
  };

  const removeDelegate = (walletAddress: string) => {
    setRemoveDelegateLoading(true);
    return epnsCommWriteProvider.removeDelegate(walletAddress).finally(() => {
      setRemoveDelegateLoading(false);
    });
  };

  const addSubgraphDetails = (input: any) => {
    setAddSubgraphDetailsLoading(true);
    return epnsWriteProvider.addSubGraph(input).finally(() => {
      setAddSubgraphDetailsLoading(false);
    });
  };

  // if (!onCoreNetwork) {
  //   //temporarily deactivate the deactivate button if not on core network
  //   return <></>;
  //

  return (
    <div>
      <DropdownWrapper background ={theme}>
        <ActiveChannelWrapper>
          {onCoreNetwork &&
            <ChannelActionButton
              disabled={channelInactive}
              onClick={() => !channelInactive && setAddSubGraphIdOpen(true)}
            >
              <div>
                {addSubgraphDetailsLoading ? (
                  <Oval color="#FFF" height={16} width={16} />
                ) : (
                  <div style={{display:'flex',justifyContent:'start'}}>
                  <AiOutlineDropbox fontSize={20}/>
                  <div style={{width:'10px'}}/>                  
                  Add SubGraph Details
                  </div>
                )}
              </div>
            </ChannelActionButton>
          }

          <ChannelActionButton
            disabled={channelInactive}
            onClick={() => !channelInactive && setAddModalOpen(true)}
          >
            <div>
              {addDelegateLoading ? (
                <Oval color="#FFF" height={16} width={16} />
              ) : (
                <div style={{display:'flex',justifyContent:'start'}}>
                  <AiOutlineUserAdd fontSize={20}/>
                  <div style={{width:'10px'}}/>                  
                  Add Delegate
                </div>
              )}
            </div>
          </ChannelActionButton>

          <ChannelActionButton
            disabled={channelInactive}
            onClick={() => !channelInactive && setRemoveModalOpen(true)}
          >
            <div>
              {removeDelegateLoading ? (
                <Oval color="#FFF" height={16} width={16} />
              ) : (
                <div style={{display:'flex',justifyContent:'start'}}>
                  <AiOutlineUserDelete fontSize={20}/>
                  <div style={{width:'10px'}}/>                  
                  Remove Delegate
                </div>
              )}
            </div>
          </ChannelActionButton>

        <ChannelActionButton
          isChannelDeactivated={isChannelDeactivated}
          onClick={toggleChannelActivationState}
        >
          <div style={{color:'red'}}>
          <div style={{display:'flex',justifyContent:'start'}}>
            <AiTwotoneDelete fontSize={20}/>
            <div style={{width:'10px',color:'red'}}/>                  
            {!onCoreNetwork ? (
              ""
              ) : loading ? (
                "Loading ..."
                ) : isChannelBlocked ? (
                  "Channel Blocked"
                  ) : isChannelDeactivated ? (
                    "Activate Channel"
                    ) : (
                      "Deactivate Channel"
                      )}
            </div>
          </div>
        </ChannelActionButton>

          
        </ActiveChannelWrapper>
      </DropdownWrapper>
      {/* modal to display the activate channel popup */}
      {showActivateChannelPopup && (
        <ActivateChannelModal
          onClose={() => {
            if (showActivateChannelPopup) {
              setShowActivateChannelPopup(false);
            }
          }}
          activateChannel={activateChannel}
          loading={loading}
          setChannelStakeFees={setChannelStakeFees}
          channelStakeFees={channelStakeFees}
        />
      )}
      {/* modal to add a delegate */}
      {addModalOpen && (
        <AddDelegateModal
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => {
            toaster.update(notificationToast(), {
              render: "Delegate Added",
              type: toaster.TYPE.INFO,
              autoClose: 5000,
            });
          }}
          addDelegate={addDelegate}
        />
      )}
      {/* modal to remove a delegate */}
      {removeModalOpen && (
        <RemoveDelegateModal
          onClose={() => {
            setRemoveModalOpen(false);
          }}
          onSuccess={() => {
            toaster.update(notificationToast(), {
              render: "Delegate Removed",
              type: toaster.TYPE.INFO,
              autoClose: 5000,
            });
          }}
          removeDelegate={removeDelegate}
        />
      )}

      {addSubGraphIdOpen && (
        <AddSubGraphIdModal
        onClose={(val) => setAddSubGraphIdOpen(val)}
        onSuccess={() => {
          toaster.update(notificationToast(), {
            render: "SubGraph Details Added",
            type: toaster.TYPE.INFO,
            autoClose: 5000,
          });
        }}
        addSubGraphDetails={addSubgraphDetails}
        />
      ) }
    </div>
  );
}

// css styles
const DropdownWrapper = styled.div`
  position: absolute;
  right: 20px;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  width: 240px;
  height: 190px;
  padding: 20px 4px;
  background: ${props => props.background.backgroundBG};
  box-sizing: border-box;
  box-shadow: 0px 4px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #E5E8F7;
  border-radius: 16px;
  justify-content: space-between;
`;

const ActiveChannelWrapper = styled.div`
  flex-direction: column;
  gap: 20px;
  display: ${(props) => (props.inactive ? "none" : "flex")};
`;

const Toaster = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0px 10px;
`;


const ToasterMsg = styled.div`
  margin: 0px 10px;
`;

const DeactivateButton = styled.div`
  text-decoration: underline;
  color: ${(props) => (props.isChannelDeactivated ? "#674C9F" : "#e20880")};
  text-align: center;
  font-size: 16px;
  line-height: 20px;
  cursor: pointer;
`;

const ChannelActionButton = styled.button`
  border: 0;
  outline: 0;
  padding: 8px 15px;
  border-radius: 5px;
  position: relative;
  background: ${props => props.theme.backgroundBG};
  color: ${props => props.theme.color};
  height: 23px;
  font-family: 'monospace, monospace';
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
  line-height: 141%;
  align-items: center;
;
  
  &:hover {
    opacity: ${(props) => (props.disabled ? 0.5 : 0.9)};
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    pointer: hand;
  }
  &:active {
    opacity: ${(props) => (props.disabled ? 0.5 : 0.75)};
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    pointer: hand;
  }
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

// Export Default
export default ChannelSettings;