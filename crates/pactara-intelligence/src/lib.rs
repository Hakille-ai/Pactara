use pactara_core::CivilizationSignal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct SignalAnalysis {
    pub total_signals: usize,
    pub signals_by_domain: HashMap<String, usize>,
    pub signals_by_severity: HashMap<i32, usize>,
    pub high_severity_count: usize,
    pub potential_correlations: Vec<String>,
    pub multi_domain_spikes: Vec<String>,
    pub risk_velocity: f32,
}

pub struct SignalAnalyzer;

impl SignalAnalyzer {
    pub fn analyze(signals: &[CivilizationSignal]) -> SignalAnalysis {
        let mut signals_by_domain = HashMap::new();
        let mut signals_by_severity = HashMap::new();
        let mut high_severity_count = 0;
        let mut potential_correlations = Vec::new();
        let mut multi_domain_spikes = Vec::new();

        for signal in signals {
            *signals_by_domain.entry(signal.domain_id.clone()).or_insert(0) += 1;
            *signals_by_severity.entry(signal.severity).or_insert(0) += 1;

            if signal.severity >= 75 {
                high_severity_count += 1;
            }

            if let Some(correlation_id) = signal.correlation_id {
                potential_correlations.push(format!("Signal {} is correlated via {}", signal.id, correlation_id));
            }
        }

        for (domain, count) in &signals_by_domain {
            if *count > 5 {
                multi_domain_spikes.push(format!("Anomalous activity spike detected in {}", domain));
            }
        }

        let risk_velocity = if signals.is_empty() {
            0.0
        } else {
            high_severity_count as f32 / signals.len() as f32
        };

        SignalAnalysis {
            total_signals: signals.len(),
            signals_by_domain,
            signals_by_severity,
            high_severity_count,
            potential_correlations,
            multi_domain_spikes,
            risk_velocity,
        }
    }
}
