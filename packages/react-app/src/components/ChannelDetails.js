import React from "react";
import moment from "moment";
import { ethers } from "ethers";
import { envConfig } from "@project/contracts";
import styled , {useTheme} from "styled-components";
import { useSelector } from "react-redux";
import ChannelsDataStore from "singletons/ChannelsDataStore";
import ShowDelegates from "./ShowDelegates";
import { Item } from "../primaries/SharedStyling";
import { postReq } from "api";
import { useWeb3React } from "@web3-react/core";
const DATE_FORMAT = "DD/MM/YYYY";

const networkName = {
  42: "Polygon Mumbai",
  1: "Polygon Mainnet"
}

export default function ChannelDetails() {
  const theme = useTheme();
  const { chainId, account } = useWeb3React();
  const { channelDetails, canVerify } = useSelector((state) => state.admin);
  const { CHANNEL_ACTIVE_STATE, CHANNNEL_DEACTIVATED_STATE } = useSelector(
    (state) => state.channels
  );
  const [verifyingChannel, setVerifyingChannel] = React.useState([]);
  const [creationDate, setCreationDate] = React.useState("");
  const [aliasVerified, setAliasVerified] = React.useState(null);
  const { channelState } = channelDetails;
  const channelIsActive = channelState === CHANNEL_ACTIVE_STATE;
  const channelIsDeactivated = channelState === CHANNNEL_DEACTIVATED_STATE;

  const CORE_CHAIN_ID = envConfig.coreContractChain;
  const onCoreNetwork = CORE_CHAIN_ID === chainId;

  React.useEffect(() => {
    if (!channelDetails || !canVerify) return;
    (async function() {
      let channelJson = await ChannelsDataStore.instance.getChannelJsonAsync(
        channelDetails.verifiedBy
      );
      setVerifyingChannel(channelJson);
    })();
  }, [channelDetails, canVerify]);

  React.useEffect(() => {
    if (!channelDetails) return;
    (async function() {
      const bn = channelDetails.channelStartBlock.toString();

      // using ethers jsonRpcProvider instead of library bcz channels are created on only core chain, that's why block can be fetched from that only
      const block = await (new ethers.providers.JsonRpcProvider(envConfig.coreRPC)).getBlock(+bn);
      const date = moment(block.timestamp * 1000);//convert from millisecs
      setCreationDate(date.format(DATE_FORMAT))
    })();
  }, [channelDetails]);
  

  React.useEffect(() => {
    if (!onCoreNetwork) return;

    (async function() {
      await postReq("/channels/get_alias_details", {
        channel : account,
        op: "read",
      }).then(async ({ data }) => {
        const aliasAccount = data;
        // console.log(aliasAccount);
        if (aliasAccount.aliasAddress) {
          const { aliasAddress } = aliasAccount;
            await postReq("/channels/get_alias_verification_status", {
              aliasAddress: aliasAddress,
              op: "read",
            }).then(({ data }) => {
              if (!data) {
                return;
              }
              const { status } = data;
              setAliasVerified(status || false);
              return data;
            });
        }
      });
    })();
  }, [account , chainId]);

  React.useEffect(() => {
    if (!onCoreNetwork) return;

    (async function() {
      await postReq("/channels/get_alias_details", {
        channel : account,
        op: "read",
      }).then(async ({ data }) => {
        const aliasAccount = data;
        console.log(aliasAccount);
        if (aliasAccount.aliasAddress) {
          const { aliasAddress } = aliasAccount;
            await postReq("/channels/get_alias_verification_status", {
              aliasAddress: aliasAddress,
              op: "read",
            }).then(({ data }) => {
              if (!data) {
                return;
              }
              const { status } = data;
              setAliasVerified(status || false);
              return data;
            });
        }
      });
    })();
  }, [account , chainId]);

  return (
    <ChannelDetailsWrapper>
      <SectionTop>
        <ImageSection src={channelDetails.icon}></ImageSection>

        <Details>
          <ChannelName>
            {channelDetails.name}
            {canVerify && <VerifyImage src="/verify.png"></VerifyImage>}
          </ChannelName>
          <ChanneStateText active={channelIsActive}>
            {channelIsActive
              ? "ACTIVE"
              : channelIsDeactivated
              ? "DEACTIVATED"
              : "BLOCKED"}
          </ChanneStateText>
          <Subscribers>
            <img src="/people.svg"></img>
            <SubscribersCount>
              {channelDetails.subscribers.length}
            </SubscribersCount>
          </Subscribers>
        </Details>
      </SectionTop>

      <SectionDes style={{ color: theme.color }}>{channelDetails.info}</SectionDes>
      
      {aliasVerified === false &&
        <Item size="20px" align="flex-start" style={{ fontWeight: 800, color: "#D6097A", marginBottom: "30px" }}>
          Please verify the Channel Alias Address to use the Channel on {networkName[chainId]} Network.
        </Item>
      }

      <SectionDate>
        {canVerify && (
          <Verified>
            <span>verified by:</span>

            <VerifyingIcon src={verifyingChannel.icon}></VerifyingIcon>
            <VerifyingName>{verifyingChannel.name}</VerifyingName>
          </Verified>
        )}

        <Date>
          <span>created on:</span>
          <span style={{ marginLeft: "10px" }}>{creationDate}</span>
        </Date>
      </SectionDate>

      <hr />

      <ShowDelegates />

      <hr />
    </ChannelDetailsWrapper>
  );
}

const ChannelDetailsWrapper = styled.div`
  padding: 30px;
  padding-bottom: 0;
`;

const SectionTop = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 30px;
`;

const ImageSection = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin-right: 20px;
`;
const VerifyImage = styled.img`
  width: 20px;
  height: 25px;
  margin-top: auto;
  margin-bottom: auto;
  margin-left: 8px;
`;

const VerifyingIcon = styled.img`
  height: 20px;
  width: 20px;
  border-radius: 50%;
  margin-left: 6px;
  margin-right: 5px;
`;

const VerifyingName = styled.div``;

const Subscribers = styled.div`
  height: fit-content;
  display: flex;
  align-items: center;
`;

const ChanneStateText = styled.span`
  color: #57c255;
  font-family: Source Sans Pro;
  font-style: normal;
  font-weight: normal;
  font-size: 18px;
  line-height: 23px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${(props) => (props.active ? "#57c255" : "red")};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  ${(props) =>
    props.active &&
    `
        &::after {
            width:8px;
            height: 8px;
            background: #57c255;
            border-radius: 50%;
            content: "";
            display: inline-flex;
            align-items: center;
            margin-left: 6px;
        }
    `}
`;

const SubscribersCount = styled.span`
  margin-left: 5px;
  padding-left: 8px;
  padding-right: 8px;
  height: 16px;
  background: #35c5f3;
  border-radius: 10px;
  font-weight: 600;
  font-size: 12px;
  line-height: 17px;
  display: inline-block;
  color: #ffffff;
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
`;

const Date = styled.div`
  display: flex;
  flex-direction: row;
  width: 240px;
  color: #674c9f;
`;

const Verified = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  & > span {
    color: #ec008c;
    fontsize: 1em;
    fontweight: bolder;
  }
`;

const ChannelName = styled.div`
  display: flex;
  flex-direction: row;
  font-family: Source Sans Pro;
  font-style: normal;
  font-weight: normal;
  font-size: 30px;
  line-height: 38px;
  margin-right: 8px;
  text-transform: capitalize;
  color: #e20880;
`;

const SectionDate = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
  line-height: 25px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 30px;
`;

const SectionDes = styled.div`
  font-family: Source Sans Pro;
  font-style: normal;
  font-weight: 300;
  font-size: 24px;
  line-height: 30px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #000000;
  margin-bottom: 40px;
`;