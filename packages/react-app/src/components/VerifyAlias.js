import React, { useRef, useState } from "react";
import styled, { css, useTheme } from "styled-components";
import { H3, Section, Item, Span, Button } from "../primaries/SharedStyling";
import { useWeb3React } from "@web3-react/core";
import AliasVerificationModal from "./AliasVerificationModal";
import { addresses, abis } from "@project/contracts";
import { useClickAway } from "react-use";
import { postReq } from "../api";
import FadeLoader from "react-spinners/FadeLoader";

const ethers = require("ethers");

const VerifyAlias = ({ aliasVerified, aliasEthAccount, setAliasVerified }) => {
  const themes = useTheme();
  const [modalOpen, setModalOpen] = React.useState(false);
  const { account, library } = useWeb3React();
  const signer = library.getSigner(account);

  // const modalRef = useRef(null);
  const polygonCommsContract = new ethers.Contract(
    addresses.epnsPolyComm,
    abis.epnsComm,
    signer
  );
  const [loading, setLoading] = useState("");
  const mainAddress = aliasEthAccount;

  // Form signer and contract connection
  // useClickAway(modalRef, () => onClose(loading !== ""));

  const checkAlias = async () => {
    if (mainAddress == aliasEthAccount) {
      submitAlias();
    } else {
      setLoading("Enter Correct Eth Channel Address");
      setTimeout(() => {
        setLoading("");
      }, 4000);
    }
  };

  const submitAlias = () => {
    setLoading("loading");
    const anotherSendTxPromise = polygonCommsContract.verifyChannelAlias(
      mainAddress
    );
    anotherSendTxPromise
      .then(async (tx) => {
        console.log(tx);
        setLoading("Transaction Sent! It usually takes 5mins to verify.");

        await tx.wait(1);
        setTimeout(() => {
          setLoading("Transaction Mined!");
        }, 2000);

        setTimeout(() => {
          setLoading("Loading...");
        }, 2000);

        const intervalId = setInterval(async () => {
          const response = await postReq(
            "/channels/get_alias_verification_status",
            {
              aliasAddress: account,
              op: "read",
            }
          );
          const status = response?.data?.status;
          if (status == true) {
            clearInterval(intervalId);
            // onSuccess();
            // onClose();
          }
        }, 5000);
      })
      .catch(() => {
        setLoading("There was an error");
        setTimeout(() => {
          setLoading("");
        }, 2000);
      });
  };

  return (
    <Item
      margin="15px 20px 15px 20px"
      flex="1"
      display="flex"
      direction="column"
    >
      <Span
        textAlign="center"
        margin="60px 0px 0px 0px"
        color={themes.color}
        size="16px"
        textTransform="none"
        weight="500"
        line="24px"
      >
        You’re almost there! Verify the Channel Alias to enable sending
        <br></br>
        Notifications from it.
      </Span>

      <Span
        textAlign="center"
        margin="60px 0px 0px 0px"
        color={"#CF1C84"}
        size="16px"
        textTransform="none"
        weight="500"
        line="24px"
      >
        {account}
      </Span>

      {loading ? (
        <Item
          display="flex"
          direction="row"
          align="center"
          margin="60px 0px 0px 0px"
        >
          <FadeLoader color="#cf1c84" loading={true} height={13} width={4} />

          <Span
            color={themes.color}
            weight="600"
            textTransform="none"
            line="22px"
            size="16px"
            margin="0px 10px"
          >
            {loading}
          </Span>
        </Item>
      ) : (
        <Item
          width="15em"
          self="stretch"
          align="stretch"
          margin="60px auto 0px auto"
        >
          <Button
            bg="#e20880"
            color="#fff"
            flex="1"
            radius="15px"
            padding="20px 10px"
            onClick={checkAlias}
          >
            <Span
              color="#fff"
              weight="600"
              textTransform="none"
              line="22px"
              size="16px"
            >
              Verify Alias Address
            </Span>
          </Button>
        </Item>
      )}
    </Item>
  );
};

export default VerifyAlias;
