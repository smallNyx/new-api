/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useState } from 'react';
import {
  Button,
  Input,
  ScrollList,
  ScrollItem,
} from '@douyinfe/semi-ui';
import { API, showError, copy, showSuccess } from '../../helpers';
import { renderQuota } from '../../helpers/render';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  IconGithubLogo,
  IconPlay,
  IconCopy,
  IconCheckCircleStroked,
} from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import { formatSubscriptionDuration } from '../../helpers/subscriptionFormat';

const STATIC_SUBSCRIPTION_PLANS = [
  {
    plan: {
      id: 1,
      title: '入门套餐',
      price_amount: 5,
      currency: 'USD',
      total_amount: 5000000,
      max_purchase_per_user: 0,
      duration_unit: 'month',
      duration_value: 1,
      features: [
        { text: '支持基础模型(GPT-5.3/Claude-4.6)', enabled: true },
        { text: '标准API响应速度', enabled: true },
        { text: '基础并发限制', enabled: true },
        { text: '7x24小时社区支持', enabled: true },
      ],
    },
  },
  {
    plan: {
      id: 2,
      title: '标准套餐',
      price_amount: 20,
      currency: 'USD',
      total_amount: 25000000,
      max_purchase_per_user: 0,
      duration_unit: 'month',
      duration_value: 1,
      features: [
        { text: '支持基础模型(GPT-5.3/Claude-4.6)', enabled: true },
        { text: '标准API响应速度', enabled: true },
        { text: '基础并发限制', enabled: true },
        { text: '7x24小时社区支持', enabled: true },
      ],
    },
  },
  {
    plan: {
      id: 3,
      title: '高级套餐',
      price_amount: 100,
      currency: 'USD',
      total_amount: 150000000,
      max_purchase_per_user: 0,
      duration_unit: 'month',
      duration_value: 1,
      features: [
        { text: '支持基础模型(GPT-5.3/Claude-4.6)', enabled: true },
        { text: '标准API响应速度', enabled: true },
        { text: '基础并发限制', enabled: true },
        { text: '7x24小时社区支持', enabled: true },
      ],
    },
  },
];

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const [subscriptionPlans, setSubscriptionPlans] = useState(STATIC_SUBSCRIPTION_PLANS);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const isChinese = i18n.language.startsWith('zh');

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      // 如果内容是 URL，则发送主题模式
      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };


  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  const featuredPlan = subscriptionPlans[0]?.plan || null;
  const secondaryPlans = subscriptionPlans.slice(1);
  const highestPricePlan = subscriptionPlans.reduce(
    (max, item) => {
      const current = Number(item?.plan?.price_amount || 0);
      return current > max ? current : max;
    },
    0,
  );
  const hudCutStyle = {
    clipPath:
      'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)',
  };
  const isDarkMode = actualTheme === 'dark';
  const bannerBgClass = isDarkMode
    ? 'bg-[radial-gradient(circle_at_18%_12%,rgba(6,182,212,0.2),transparent_36%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.18),transparent_34%),linear-gradient(180deg,#070B17_0%,#090E1C_56%,#0A0E1A_100%)]'
    : 'bg-[radial-gradient(circle_at_18%_12%,rgba(6,182,212,0.12),transparent_38%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.1),transparent_36%),linear-gradient(180deg,#F7FAFF_0%,#EFF6FF_56%,#F8FAFC_100%)]';
  const gridOverlayClass = isDarkMode
    ? 'bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] opacity-20'
    : 'bg-[linear-gradient(rgba(30,41,59,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.08)_1px,transparent_1px)] opacity-30';
  const scanClass = isDarkMode
    ? 'bg-gradient-to-b from-cyan-400/25 via-cyan-300/10 to-transparent'
    : 'bg-gradient-to-b from-cyan-500/12 via-cyan-400/8 to-transparent';
  const baseUrlInputClass = isDarkMode
    ? 'flex-1 !rounded-full !bg-[#0B1328]/85 !border !border-cyan-400/40 backdrop-blur-xl'
    : 'flex-1 !rounded-full !bg-white/88 !border !border-cyan-500/25 backdrop-blur-xl';
  const titleClass = isDarkMode
    ? 'text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-fuchsia-300'
    : 'text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 via-blue-700 to-fuchsia-700';
  const featuredCardClass = isDarkMode
    ? 'relative overflow-hidden rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-500/20 to-transparent p-5 md:p-6'
    : 'relative overflow-hidden rounded-2xl border border-blue-300/60 bg-gradient-to-br from-blue-200/55 to-white/80 p-5 md:p-6 shadow-[0_10px_28px_rgba(59,130,246,0.15)]';
  const featuredTagClass = isDarkMode
    ? 'text-xs font-medium tracking-wider text-blue-300 uppercase'
    : 'text-xs font-medium tracking-wider text-blue-700 uppercase';
  const priceClass = isDarkMode
    ? 'mt-4 text-4xl font-extrabold text-cyan-300 drop-shadow-[0_0_16px_rgba(34,211,238,0.35)]'
    : 'mt-4 text-4xl font-extrabold text-cyan-700';
  const statCardLeftClass = isDarkMode
    ? 'rounded-xl border border-cyan-500/30 bg-[#0D162E]/70 p-3'
    : 'rounded-xl border border-cyan-300/55 bg-white/85 p-3';
  const statCardRightClass = isDarkMode
    ? 'rounded-xl border border-fuchsia-500/30 bg-[#13172B]/70 p-3'
    : 'rounded-xl border border-fuchsia-300/55 bg-white/85 p-3';

  return (
    <div className='w-full overflow-x-hidden'>
      <style>{`
        @keyframes hud-scan {
          0% { transform: translateY(-110%); opacity: 0; }
          15% { opacity: 0.22; }
          50% { opacity: 0.14; }
          100% { transform: translateY(110%); opacity: 0; }
        }
        @keyframes hud-flow {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='w-full overflow-x-hidden'>
          {/* Banner 部分 */}
          <div
            className={`w-full border-b border-cyan-500/20 min-h-[500px] md:min-h-[600px] lg:min-h-[700px] relative overflow-x-hidden ${bannerBgClass}`}
          >
            {/* 背景模糊晕染球 */}
            <div className={`blur-ball blur-ball-indigo ${isDarkMode ? 'opacity-60' : 'opacity-35'}`} />
            <div className={`blur-ball blur-ball-teal ${isDarkMode ? 'opacity-60' : 'opacity-35'}`} />
            <div
              className={`absolute inset-0 ${gridOverlayClass} bg-[size:32px_32px] pointer-events-none`}
            />
            <div className='absolute inset-0 pointer-events-none overflow-hidden'>
              <div
                className={`absolute inset-x-0 h-28 ${scanClass} blur-sm`}
                style={{ animation: 'hud-scan 7s linear infinite' }}
              />
            </div>
            <div className='flex items-center justify-center h-full px-4 py-20 md:py-24 lg:py-32 mt-10'>
              {/* 居中内容区 */}
              <div className='flex flex-col items-center justify-center text-center max-w-4xl mx-auto'>
                <div className='flex flex-col items-center justify-center mb-6 md:mb-8'>
                  <h1
                    className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-semi-color-text-0 leading-tight drop-shadow-[0_0_18px_rgba(6,182,212,0.25)] ${isChinese ? 'tracking-wide md:tracking-wider' : ''}`}
                  >
                    <>
                      {t('统一的')}
                      <br />
                      <span className='shine-text'>{t('大模型接口网关')}</span>
                    </>
                  </h1>
                  <p className='text-base md:text-lg lg:text-xl text-semi-color-text-1 mt-4 md:mt-6 max-w-xl'>
                    {t('更好的价格，更好的稳定性，只需要将模型基址替换为：')}
                  </p>
                  {/* BASE URL 与端点选择 */}
                  <div className='flex flex-col md:flex-row items-center justify-center gap-4 w-full mt-4 md:mt-6 max-w-md'>
                    <Input
                      readonly
                      value={serverAddress}
                      className={baseUrlInputClass}
                      size={isMobile ? 'default' : 'large'}
                      suffix={
                        <div className='flex items-center gap-2'>
                          <ScrollList
                            bodyHeight={32}
                            style={{ border: 'unset', boxShadow: 'unset' }}
                          >
                            <ScrollItem
                              mode='wheel'
                              cycled={true}
                              list={endpointItems}
                              selectedIndex={endpointIndex}
                              onSelect={({ index }) => setEndpointIndex(index)}
                            />
                          </ScrollList>
                          <Button
                            type='primary'
                            onClick={handleCopyBaseURL}
                            icon={<IconCopy />}
                            className='!rounded-full !bg-cyan-500 !border-0 shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                          />
                        </div>
                      }
                    />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className='flex flex-row gap-4 justify-center items-center'>
                  <Link to='/console'>
                    <Button
                      theme='solid'
                      type='primary'
                      size={isMobile ? 'default' : 'large'}
                      className='!rounded-3xl px-8 py-2 !border-0 !bg-gradient-to-r !from-cyan-500 !to-blue-500 shadow-[0_0_24px_rgba(34,211,238,0.35)]'
                      icon={<IconPlay />}
                    >
                      {t('获取密钥')}
                    </Button>
                  </Link>
                  {isDemoSiteMode && statusState?.status?.version ? (
                    <Button
                      size={isMobile ? 'default' : 'large'}
                      className='flex items-center !rounded-3xl px-6 py-2 !bg-[#12192e]/80 !border !border-fuchsia-400/35 !text-semi-color-text-0'
                      icon={<IconGithubLogo />}
                      onClick={() =>
                        window.open(
                          'https://github.com/QuantumNous/new-api',
                          '_blank',
                        )
                      }
                    >
                      {statusState.status.version}
                    </Button>
                  ) : null}
                </div>

                <section className='w-full mt-14 md:mt-16 max-w-6xl mx-auto'>
                  <div className='absolute left-1/2 -translate-x-1/2 mt-14 w-[72%] h-20 bg-cyan-500/10 blur-3xl pointer-events-none' />
                  <div className='relative h-[2px] max-w-xl mx-auto mt-8 mb-2 overflow-hidden'>
                    <div className='absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent blur-[1px]' />
                    <div
                      className='absolute inset-y-0 w-40 bg-gradient-to-r from-transparent via-fuchsia-300/75 to-transparent blur-[1px]'
                      style={{ animation: 'hud-flow 5.5s linear infinite' }}
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className={titleClass}>
                      {t('订阅套餐中心')}
                    </h2>
                    <p className='mt-3 text-sm md:text-base text-semi-color-text-2'>
                      {t('按业务阶段灵活选择，开通后立即生效')}
                    </p>
                    <p className='mt-3 text-sm md:text-base text-semi-color-text-2'>
                      {t('解锁Claude,OpenAI等主流大模型(详见模型广场)')}
                    </p>
                  </div>
                  {subscriptionLoading ? (
                    <div className='text-center text-semi-color-text-2 text-sm py-8'>
                      {t('加载中...')}
                    </div>
                  ) : subscriptionPlans.length > 0 ? (
                    <div className='mt-12 flex flex-wrap justify-center items-stretch gap-6 px-4'>
                      {subscriptionPlans.map((item, index) => {
                        const plan = item?.plan || {};
                        const isPopular = index === 0;
                        const totalAmount = Number(plan?.total_amount || 0);
                        const price = Number(plan?.price_amount || 0).toFixed(2);
                        const limit = Number(plan?.max_purchase_per_user || 0);

                        return (
                          <div
                            key={plan?.id || index}
                            className={`relative flex flex-col p-6 border border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-[#0B1328]/80 backdrop-blur-sm w-full md:w-80 transition-all duration-300 hover:scale-[1.02] ${
                              isPopular ? 'md:w-80 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] z-10' : 'hover:border-blue-500/30'
                            }`}
                          >
                            {/* Corner Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-gray-800 dark:border-white/80"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-gray-800 dark:border-white/80"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-gray-800 dark:border-white/80"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-gray-800 dark:border-white/80"></div>

                            {isPopular && (
                              <div className="absolute -top-8 left-0 right-0 text-center">
                                <span className="text-gray-800 dark:text-white text-sm font-bold tracking-wider">{t('推荐套餐')}</span>
                              </div>
                            )}

                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white text-center mt-4 mb-2">
                              {plan?.title || t('订阅套餐')}
                            </h3>

                            <div className="text-center mb-6">
                              <div className="flex items-baseline justify-center text-gray-800 dark:text-white">
                                <span className="text-2xl font-bold mr-1">$</span>
                                <span className="text-5xl font-extrabold tracking-tight">{price}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-medium">USD</span>
                              </div>
                            </div>

                            <div className="flex-1 space-y-4 text-center text-gray-600 dark:text-gray-300 text-sm mb-8 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <span>{t('有效期')}:</span>
                                <span className="text-gray-800 dark:text-white font-medium">{formatSubscriptionDuration(plan, t)}</span>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <span>{t('总额度')}:</span>
                                <span className="text-gray-800 dark:text-white font-medium">
                                  {totalAmount > 0 ? renderQuota(totalAmount) : t('不限')}
                                </span>
                              </div>
                              {limit > 0 && (
                                <div className="flex items-center justify-center gap-2">
                                  <span>{t('限购')}:</span>
                                  <span className="text-gray-800 dark:text-white font-medium">{limit}</span>
                                </div>
                              )}

                              {plan.features && plan.features.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50 space-y-2 text-left">
                                  {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <IconCheckCircleStroked className="text-cyan-500 mt-0.5 shrink-0" />
                                      <span className={`text-sm ${feature.enabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 line-through'}`}>
                                        {feature.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Link to='/console/topup' className="w-full">
                              <Button
                                theme='solid'
                                type='primary'
                                className='w-full !rounded-full !font-bold !bg-blue-500 hover:!bg-blue-600 !border-none !h-10 !text-base shadow-lg shadow-blue-500/20'
                              >
                                {t('立即订阅')}
                              </Button>
                            </Link>

                            {isPopular && (
                              <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700/50">
                                <div className="text-center border border-gray-200 dark:border-gray-700/50 rounded-lg p-2 bg-gray-50 dark:bg-white/5">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('可选套餐')}</div>
                                  <div className="text-gray-800 dark:text-white font-bold text-lg">{subscriptionPlans.length}</div>
                                </div>
                                <div className="text-center border border-gray-200 dark:border-gray-700/50 rounded-lg p-2 bg-gray-50 dark:bg-white/5">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('最高档位')}</div>
                                  <div className="text-gray-800 dark:text-white font-bold text-lg">${highestPricePlan.toFixed(2)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='text-center text-semi-color-text-2 text-sm py-8'>
                      {t('暂无可购买套餐')}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
