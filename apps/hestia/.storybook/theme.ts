import { create } from '@storybook/theming/create';
//@ts-ignore
import brandImage from "../public/logo.svg"

export default create({
  base: 'dark',
  colorPrimary: '#8B909A',
  colorSecondary: '#E6007A',
  appBg: '#06070A',
  appPreviewBg: '#06070A',
  appContentBg: '#131419',
  appBorderRadius: 4,
  barTextColor: '#fff',
  barSelectedColor: '#fff',
  barBg: '#1F2229',
  inputBg: '#2E303C',
  inputTextColor: '#fff',
  inputBorderRadius: 4,

  brandTitle:'Polkadex Orderbook',
  brandImage,
  brandUrl:'https://orderbook.polkadex.trade/',
})