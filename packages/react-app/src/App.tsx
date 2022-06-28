import React, {useState} from "react";
import ReactGA from "react-ga";

import { Web3Provider } from "ethers/providers";
import { useWeb3React } from "@web3-react/core";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { useEagerConnect, useInactiveListener } from "hooks";
import { injected, walletconnect, portis, ledger } from "connectors";
import { envConfig } from "@project/contracts";
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step } from "react-joyride";

import styled, {useTheme} from "styled-components";
import { Item, ItemH, Span, H2, H3, B, A, C, Button } from "components/SharedStyling";
import Header from "sections/Header";
import Navigation from "sections/Navigation";

import NavigationContextProvider from "contexts/NavigationContext";
import MasterInterfacePage from "pages/MasterInterfacePage";

import {ThemeProvider} from "styled-components";

import { themeLight, themeDark } from "config/Themization";
import GLOBALS from "config/Globals";

import {setRun, setIndex, setWelcomeNotifsEmpty} from "./redux/slices/userJourneySlice";
import { useSelector, useDispatch } from "react-redux";
import UserJourneySteps from "segments/userJourneySteps";
import { getPushToken, onMessageListener } from "./firebase";

import * as dotenv from "dotenv";
import { postReq } from "api";
import { toast } from "react-toastify";
dotenv.config();

const CACHEPREFIX = "PUSH_TOKEN_";
// define the different type of connectors which we use
const web3Connectors = {
  Injected: {
    obj: injected,
    logo: "./svg/login/metamask.svg",
    title: "MetaMask",
  },
  WalletConnect: {
    obj: walletconnect,
    logo: "./svg/login/walletconnect.svg",
    title: "Wallet Connect",
  },
  // Trezor: {obj: trezor, logo: './svg/login/trezor.svg', title: 'Trezor'},
  Ledger: { obj: ledger, logo: "./svg/login/ledger.svg", title: "Ledger" },
  Portis: { obj: portis, logo: "./svg/login/portis.svg", title: "Portis" },
};
export default function App() {

  const dispatch = useDispatch();

  const { connector, activate, active, error, account } = useWeb3React<Web3Provider>();
  const [info, setInfo] = useState("");
  const [activatingConnector, setActivatingConnector] = React.useState<
    AbstractConnector
  >();
  const [currentTime, setcurrentTime] = React.useState(0);
  const themes = useTheme();

  const {
    run,
    stepIndex,
    tutorialContinous,
  } = useSelector((state: any) => state.userJourney);
  const [triggerNotification, setTriggerNotification] = React.useState(false);
  React.useEffect(() => {
    if(!account) return;
    (async function(){
      const tokenKey = `${CACHEPREFIX}${account}`;
      const tokenExists = localStorage.getItem(tokenKey) || localStorage.getItem(CACHEPREFIX); //temp to prevent more than 1 account to register
      if(!tokenExists){
        const response = await getPushToken();
        const object = {
          op: 'register',
          wallet: account.toLowerCase(),
          device_token: response,
          platform: 'dapp',
        };
        await postReq('/pushtokens/register_no_auth',object);
        localStorage.setItem(tokenKey, response);
        localStorage.setItem(CACHEPREFIX, 'response'); //temp to prevent more than 1 account to register
      }
    })();
  }, [account]);

  // React.useEffect(() => {
    onMessageListener().then(payload => {
      if (!("Notification" in window)) {
        toast.dark(`${payload.notification.body} from: ${payload.notification.title}`,{
          type: toast.TYPE.DARK,
          autoClose: 5000,
          position: "top-right"
        });
      }else{
        console.log('\n\n\n\n\n')
        console.log("revieced push notification")
        console.log('\n\n\n\n\n')
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
          title: payload.data.app,
          body: payload.notification.body,
          image: payload.data.aimg,
          icon: payload?.data?.icon,
          data: {
            url: payload?.data?.acta || payload?.data?.url,
          },
        };
        var notification = new Notification(notificationTitle,notificationOptions );
      }
    }).catch(err => console.log('failed: ', err))
    .finally(() => setTriggerNotification(!triggerNotification)); //retrigger the listener after it has been used once
  // }, [triggerNotification]);
  

  React.useEffect(() => {
    const now = Date.now()/ 1000;
    setcurrentTime(now)
  },[])
  React.useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();
  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);

  // Initialize GA
  ReactGA.initialize(envConfig.googleAnalyticsId);
  ReactGA.pageview("/login");
  // Initialize GA

  // Initialize Theme
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  }

  React.useEffect(() => {
    const data = localStorage.getItem('theme')
    if(data){
      setDarkMode(JSON.parse(data))
    }
  },[])

  React.useEffect(() => {
    localStorage.setItem('theme', JSON.stringify(darkMode))
  })

  React.useEffect(()=>{
    document.body.style.backgroundColor = darkMode ? "#000" : "#fff";
  },[darkMode])


  React.useEffect(()=>{
    window?.Olvy?.init({
      organisation: "epns",
    target: "#olvy-target",
    type: "sidebar",
    view: {
      showSearch: false,
      compact: false,
      showHeader: true, // only applies when widget type is embed. you cannot hide header for modal and sidebar widgets
      showUnreadIndicator: true,
      unreadIndicatorColor: "#cc1919",
      unreadIndicatorPosition: "top-right"
    }
    });
    return function cleanup() {
      window?.Olvy?.teardown();
    };
  });

  const steps = UserJourneySteps({darkMode});

  const handleJoyrideCallback = (data: CallBackProps) => {
    // console.log(data)
    // console.log(STATUS);
    const { action, lifecycle, status, index } = data
    if (lifecycle === "ready") {
      setTimeout(() => {
        document.querySelector("div > section > div").scrollTop = 0
      }, 100)
    }
    
    
    if ( action === "close" || index === 20 ) { //action === "close" ||
      dispatch(setRun(false))
      dispatch(setIndex(0))
      dispatch(setWelcomeNotifsEmpty());
    }
    // else if (action === 'next' && status === 'running') {
    //   dispatch(incrementStepIndex());
    // }
  }

  // toast customize
  // const LoaderToast = ({ msg, color }) => (
  //   <Toaster>
  //     <Loader type="Oval" color={color} height={30} width={30} />
  //     <ToasterMsg>{msg}</ToasterMsg>
  //   </Toaster>
  // );


  return (
    <ThemeProvider theme={darkMode ? themeDark : themeLight }>
      <NavigationContextProvider>
        <Joyride
          run={run}
          steps={steps}
          continuous={tutorialContinous}
          stepIndex={stepIndex}
          // hideFooter={true}
          // primaryProps={false}
          hideBackButton={true}
          hideCloseButton={false}
          disableScrolling={true}
          disableScrollParentFix={true}
          // disableFlip={true}
          // showNextButton={false}
          showSkipButton={false}
          disableOverlayClose={true}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              arrowColor: darkMode ? themeDark.dynamicTutsBg : themeLight.dynamicTutsBg,
              backgroundColor: darkMode ? themeDark.dynamicTutsBg : themeLight.dynamicTutsBg,
              overlayColor:  darkMode ? themeDark.dynamicTutsBgOverlay : themeLight.dynamicTutsBgOverlay,
              primaryColor: darkMode ? themeDark.dynamicTutsPrimaryColor : themeLight.dynamicTutsPrimaryColor,
              textColor: darkMode ? themeDark.dynamicTutsFontColor : themeLight.dynamicTutsFontColor,
              zIndex: 1000,
            },
          }}
        />
        <HeaderContainer>
          <Header
            isDarkMode={darkMode}
            darkModeToggle={toggleDarkMode}
          />  
        </HeaderContainer>

        <ParentContainer
          headerHeight={GLOBALS.CONSTANTS.HEADER_HEIGHT}
        >

          {(active) && !error && (
            <>
              <LeftBarContainer
                leftBarWidth={GLOBALS.CONSTANTS.LEFT_BAR_WIDTH}
              >
                <Navigation />
              </LeftBarContainer>

              <ContentContainer
                leftBarWidth={GLOBALS.CONSTANTS.LEFT_BAR_WIDTH}
              >
                {/* Shared among all pages, load universal things here */}
                <MasterInterfacePage />
              </ContentContainer>
            </>
          )}

          {(!active) && (
            <Item
              justify="flex-start"
              padding="15px"
            >
              <ProviderLogo
                src="./epnshomelogo.png"
                srcSet={"./epnshomelogo@2x.png 2x, ./epnshomelogo@2x.png 3x"}
              />
              
              <Item
                bg={darkMode ? themeDark : themeLight}
                border="1px solid #ddd"
                padding="15px"
                radius="12px"
                flex="initial"
              >
                <H2 textTransform="uppercase" spacing="0.1em">
                  <Span bg="#e20880" color="#fff" weight="600" padding="0px 8px">
                    Connect
                  </Span>
                  <Span weight="200" color={darkMode ? themeDark : themeLight}> Your Wallet</Span>
                </H2>

                <ItemH maxWidth="700px" align="stretch">
                  {Object.keys(web3Connectors).map((name) => {
                    const currentConnector = web3Connectors[name].obj;
                    const connected = currentConnector === connector;
                    const disabled =
                      !triedEager ||
                      !!activatingConnector ||
                      connected ||
                      !!error;
                    const image = web3Connectors[name].logo;
                    const title = web3Connectors[name].title;

                    return (
                      <ProviderButton
                        disabled={disabled}
                        key={name}
                        onClick={() => {
                          setActivatingConnector(currentConnector);
                          activate(currentConnector);
                        }}
                        border="#35c5f3"
                      >
                        <ProviderImage src={image} />

                        <Span
                          spacing="0.1em"
                          textTransform="uppercase"
                          size="12px"
                          weight="600"
                          padding="20px"
                          background={darkMode ? themeDark.backgroundBG : themeLight.backgroundBG}
                          color={darkMode ? themeDark.fontColor : themeLight.fontColor}

                        >
                          {title}
                        </Span>
                      </ProviderButton>
                    );
                  })}
                </ItemH>
              </Item>

              <Span margin="30px 0px 0px 0px" size="14px" color={darkMode ? themeDark.fontColor : themeLight.fontColor }>
                By unlocking your wallet, <B>You agree</B> to our{" "}
                <A href="https://epns.io/tos" target="_blank">
                  Terms of Service
                </A>{" "}
                and our{" "}
                <A href="https://epns.io/privacy" target="_blank">
                  Privacy Policy
                </A>
                .
              </Span>
              <Item
                flex="initial"
                padding="30px 15px"
                radius="12px"
              >
                <StyledItem>
                  <span> Note: </span> The EPNS protocol has been under development for 1+ year,  and completed a <C href="https://epns.io/EPNS-Protocol-Audit2021.pdf" target="_blank"> ChainSafe audit </C> in October 2021. However, the mainnet is still a new product milestone.  Always DYOR, and anticipate bugs and UI improvements.  Learn how to report any bugs in our  <C href="https://discord.com/invite/YVPB99F9W5" target="_blank">Discord.</C>
                </StyledItem>
              </Item>

            </Item>
          )}
        </ParentContainer>
      </NavigationContextProvider>
    </ThemeProvider>
  );
}

// CSS STYLES
const StyledItem = styled(Item)`
  font-size: 14px;
  letter-spacing: 0.4px;
  display: block;
  background: ${props => props.theme.backgroundBG};
  color: ${props => props.theme.color};
  border:1px solid #ddd;
  padding:30px 15px;
  border-radius:12px;
  line-height: 18px;
  align-items: center;
  width:44rem;

  span{
    color: #e20880;
  }

  @media(max-width:400px){
    width: auto;
  }
`;


const HeaderContainer = styled.header`
  left: 0;
  right: 0;
  width: 100%;
  position: fixed;
  top: 0;
  z-index: 999;
`;

const ParentContainer = styled.div`
  flex-wrap: wrap;
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex: 1;
  background: ${props => props.theme.backgroundBG};
  margin: ${props => props.headerHeight}px 0px 0px 0px;
  min-height: calc(100vh - ${GLOBALS.CONSTANTS.HEADER_HEIGHT}px);
`;

const LeftBarContainer = styled.div`
  left: 0;
  top: 0;
  bottom: 0;
  width: ${props => props.leftBarWidth}px;
  position: fixed;

  @media (max-width: 992px) {
    display: none;
  }
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  align-self: center;
  width: 100%;



  margin: 0px 0px 0px ${props => props.leftBarWidth}px;

  @media (max-width: 992px) {
    margin: 0px;
  }
`;

const ProviderLogo = styled.img`
  width: 15vw;
  align-self: center;
  display: flex;
  margin: 10px 20px 20px 20px;
  min-width: 200px;
`;

const ProviderButton = styled.button`
  flex: 1 1 0;
  min-width: 280px;
  background: ${props => props.theme.mainBg};
  outline: 0;ProviderButton

  box-shadow: 0px 15px 20px -5px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  border: 1px solid rgb(225, 225, 225);

  margin: 20px;
  overflow: hidden;

  display: flex;
  align-items: center;
  justify-content: center;

  display: flex;
  flex-direction: row;
  padding: 10px;

  &:hover {
    opacity: 0.9;
    cursor: pointer;
    border: 1px solid ${(props) => props.border};
  }
  &:active {
    opacity: 0.75;
    cursor: pointer;
    border: 1px solid ${(props) => props.border};
  }
`;

const ProviderImage = styled.img`
  width: 32px;
  max-height: 32px;
  padding: 10px;
`;

const BeaconExample = styled.span`
  height: 10px;
  width: 10px;
  background: ${props => props.theme.dynamicTutsPrimaryColor};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 100%;
  position: relative;
  margin: 0px 10px;
`;

const BeaconExamplePulse = styled.span`
  animation: 1.2s ease-in-out 0s infinite normal none running joyride-beacon-outer;
  background-color: transparent;
  border: 2px solid ${props => props.theme.dynamicTutsPrimaryColor};
  border-radius: 50%;
  box-sizing: border-box;
  display: block;
  height: 26px;
  width: 26px;
  left: -8px;
  top: -8px;
  opacity: 0.9;
  position: absolute;
  transform-origin: center center;
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
