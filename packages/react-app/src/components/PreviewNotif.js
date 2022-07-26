import React from "react";
import styled, { ThemeProvider, useTheme } from "styled-components";
import { Item, Span, H2 } from "../primaries/SharedStyling";
import { useWeb3React } from "@web3-react/core";
import { NotificationItem } from "@epnsproject/sdk-uiweb";
import { useSelector } from "react-redux";

const blockchainName = {
  1: "ETH_MAINNET",
  137: "POLYGON_MAINNET",
  42: "ETH_TEST_KOVAN",
  80001: "POLYGON_TEST_MUMBAI",
};

export default function PreviewNotif({ details }) {
  const { delegatees, channelDetails } = useSelector((state) => state.admin);
  const { chainId } = useWeb3React();

  let channelDetail;
  channelDetail = delegatees.filter(delegateeInfo => delegateeInfo.address == details.channelAddress)[0];
  if(!channelDetail) channelDetail = channelDetails; 

  const themes = useTheme();
  const NotifItem = ({ test }) => {
    return (
      channelDetail && (
        <NotificationItem
          notificationTitle={test?.asub}
          notificationBody={test?.amsg}
          cta={test?.acta}
          app={channelDetail.name}
          icon={channelDetail.icon}
          image={test?.aimg}
          chainName={blockchainName[chainId]}
          theme={themes.scheme}
        />
      )
    );
  };

  return (
    <ThemeProvider theme={themes}>
      <PreviewSpace>
        <Item align="flex-start">
          <H2 textTransform="uppercase" spacing="0.1em">
            <Span weight="200" style={{ color: themes.color }}>
              Notification
            </Span>
            <Span bg="#674c9f" color="#fff" weight="600" padding="0px 8px">
              Preview
            </Span>
          </H2>
        </Item>
        <NotifItem test={details} />
      </PreviewSpace>
    </ThemeProvider>
  );
}

const Overlay = styled.div`
  top: 0;
  left: 0;
  right: 0;
  background: ${(props) => props.theme.scrollBg};
  height: 100%;
  width: 100%;
  z-index: 1000;
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-y: scroll;
`;

const PreviewSpace = styled.div`
  //   padding: 20px 30px;
  width: 95%;
  background: ${(props) => props.theme.backgroundBG};
`;
