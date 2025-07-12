# Monitoring Git Contextor with Kibana

Git Contextor provides comprehensive monitoring capabilities that can be integrated with Kibana for advanced observability and analytics.

## Overview

Git Contextor exposes various metrics and logs that can be ingested into Elasticsearch and visualized in Kibana:

- **API Usage Metrics**: Search queries, chat interactions, and API endpoint usage
- **Performance Metrics**: Response times, indexing performance, and resource usage
- **Error Tracking**: Application errors, failed queries, and system issues
- **Activity Logs**: File changes, indexing operations, and user interactions

## Integration Approaches

### 1. Log-based Integration

Git Contextor outputs structured logs that can be collected using tools like Filebeat:

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/git-contextor/logs/*.log
  fields:
    service: git-contextor
    environment: production
  processors:
    - add_host_metadata:
        when.not.contains.tags: forwarded
```

### 2. Metrics API Integration

Git Contextor provides a `/api/metrics` endpoint that exposes Prometheus-compatible metrics:

```bash
# Sample metrics endpoint call
curl -H "x-api-key: your-api-key" \
  http://localhost:3333/api/metrics
```

### 3. Custom Dashboard Setup

Create Kibana dashboards to visualize:

- **Search Analytics**: Query volume, popular searches, response times
- **Repository Health**: Indexing status, file changes, storage usage
- **User Activity**: Active users, feature usage, error rates
- **Performance Trends**: API latency, embedding generation times

## Configuration

### Environment Variables

```bash
# Enable detailed logging for Kibana ingestion
export DEBUG=git-contextor:*
export LOG_LEVEL=info
export LOG_FORMAT=json
```

### Kibana Index Patterns

Recommended index patterns for Git Contextor data:

- `git-contextor-logs-*` - Application logs
- `git-contextor-metrics-*` - Performance metrics
- `git-contextor-usage-*` - User activity data

## Sample Visualizations

### 1. Search Query Volume
```json
{
  "visualization": {
    "title": "Git Contextor Search Volume",
    "type": "histogram",
    "params": {
      "grid": {"categoryLines": false, "style": {"color": "#eee"}},
      "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "bottom"}],
      "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "left"}]
    }
  }
}
```

### 2. API Response Times
```json
{
  "visualization": {
    "title": "API Response Times",
    "type": "line",
    "params": {
      "grid": {"categoryLines": false, "style": {"color": "#eee"}},
      "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "bottom"}],
      "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "left"}]
    }
  }
}
```

## Best Practices

1. **Index Lifecycle Management**: Configure ILM policies to manage log retention
2. **Alerting**: Set up Watcher alerts for error rates and performance degradation
3. **Security**: Use Kibana security features to control access to monitoring data
4. **Custom Fields**: Add custom fields to correlate Git Contextor data with other systems

## Troubleshooting

### Common Issues

- **Missing Data**: Check Elasticsearch ingest pipelines and Filebeat configuration
- **Performance**: Monitor index size and query performance in Kibana
- **Authentication**: Ensure proper API key configuration for metrics endpoint

### Debug Commands

```bash
# Check Git Contextor metrics endpoint
curl -i -H "x-api-key: your-key" http://localhost:3333/api/metrics

# Verify Elasticsearch connectivity
curl -X GET "localhost:9200/_cluster/health?pretty"

# Check Kibana index patterns
curl -X GET "localhost:5601/api/saved_objects/_find?type=index-pattern"
```

## Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana User Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Git Contextor API Reference](../API_REFERENCE.md)
- [Git Contextor Metrics Guide](../ADVANCED_CONFIGURATION.md#monitoring-and-observability)
