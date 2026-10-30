import { ArrowRightOutlined, CalculatorOutlined, EnvironmentOutlined, MailOutlined, PhoneOutlined, TeamOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Col, Radio, Row, Tag, Typography } from 'antd';
import { SplitMethod } from '@shared/calc';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalculatorModal } from '../components/CalculatorModal';
import { HeroIllustration } from '../components/HeroIllustration';

export function HomePage() {
  const location = useLocation();
  const [method, setMethod] = useState<SplitMethod>('even');
  const [modalOpen, setModalOpen] = useState(false);

  // Nav links point to /#about and /#contact; scroll on every navigation, even to the same hash.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.key, location.hash]);

  return (
    <>
      <section className="hero">
        <div className="container">
          <Row gutter={[48, 32]} align="middle">
            <Col xs={24} md={13}>
              <Typography.Title className="hero__title">Split the bill, not the friendship.</Typography.Title>
              <Typography.Paragraph className="hero__lead">
                Work out the tip, the total and everyone's share in seconds. Every share adds up exactly, down to the cent.
              </Typography.Paragraph>

              <Card className="hero-calculator" bordered={false}>
                <Typography.Text strong id="method-label">
                  How do you want to split?
                </Typography.Text>
                <Radio.Group
                  className="method-picker"
                  aria-labelledby="method-label"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <Radio.Button value="even">
                    <TeamOutlined /> <strong>Even</strong>
                    <span className="method-picker__hint">Everyone pays the same</span>
                  </Radio.Button>
                  <Radio.Button value="itemised">
                    <UnorderedListOutlined /> <strong>Itemised</strong>
                    <span className="method-picker__hint">Pay for what you ordered</span>
                  </Radio.Button>
                </Radio.Group>
                <Button type="primary" size="large" block icon={<CalculatorOutlined />} onClick={() => setModalOpen(true)}>
                  Start splitting
                </Button>
              </Card>
            </Col>
            <Col xs={0} md={11} className="hero-art">
              <HeroIllustration />
            </Col>
          </Row>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <Typography.Title level={2}>About</Typography.Title>
          <Typography.Paragraph className="section__lead">
            Tip &amp; Bill Splitter is for anyone settling up after a meal with friends or family. Enter the bill, pick a tip,
            and see exactly what each person owes. No mental maths, no shares that don't add up.
          </Typography.Paragraph>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <TeamOutlined className="feature-card__icon" />
                <Typography.Title level={4}>Even split</Typography.Title>
                <Typography.Paragraph>
                  Splits the bill and tip equally. Good when everyone shared everything.
                </Typography.Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <UnorderedListOutlined className="feature-card__icon" />
                <Typography.Title level={4}>Itemised split</Typography.Title>
                <Typography.Paragraph>
                  Add what each person ordered, including shared dishes. Tax, fees and tip are shared out in proportion to each
                  person's items.
                </Typography.Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <CalculatorOutlined className="feature-card__icon" />
                <Typography.Title level={4}>Fair to the cent</Typography.Title>
                <Typography.Paragraph>
                  Amounts are rounded to the cent and leftover cents are spread fairly, so the shares always add up to the
                  total.
                </Typography.Paragraph>
              </Card>
            </Col>
          </Row>
          <Typography.Paragraph type="secondary" style={{ marginTop: 24 }}>
            Anyone can calculate and share a result. Create a free account to save results and find them later in your History.
          </Typography.Paragraph>
        </div>
      </section>

      <section id="contact" className="section section--alt">
        <div className="container">
          <Typography.Title level={2}>Contact Us</Typography.Title>
          <Typography.Paragraph className="section__lead">
            Questions, feedback or found a bug? We'd love to hear from you.
          </Typography.Paragraph>
          <Tag color="gold" style={{ marginBottom: 16 }}>
            Placeholder details for demonstration only
          </Tag>
          <ul className="contact-list">
            <li>
              <MailOutlined /> support@example.com
            </li>
            <li>
              <PhoneOutlined /> +1 (555) 010-0000
            </li>
            <li>
              <EnvironmentOutlined /> 123 Example Street, Anytown, USA
            </li>
          </ul>
          <Button type="link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} icon={<ArrowRightOutlined rotate={-90} />}>
            Back to the calculator
          </Button>
        </div>
      </section>

      <CalculatorModal open={modalOpen} method={method} onClose={() => setModalOpen(false)} />
    </>
  );
}
