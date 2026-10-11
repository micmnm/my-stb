using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Exporter;
using OpenTelemetry.Trace;
using Serilog.Events;
using Serilog.Parsing;
using Xunit;
using MyStb.Api;

namespace MyStb.Api.Tests;

// One class on purpose: two tests set a process-wide environment variable, and xUnit runs
// the tests of one class one after another.
public class ObservabilityTests
{
    private static JsonElement Format(LogEvent logEvent)
    {
        using var writer = new StringWriter();
        Observability.CreateLogFormatter("my-stb-api", "dev").Format(logEvent, writer);
        var text = writer.ToString();
        Assert.Equal(1, text.Count(c => c == '\n'));
        Assert.EndsWith("\n", text);
        return JsonDocument.Parse(text).RootElement;
    }

    private static LogEvent Event(LogEventLevel level, string message, Exception? exception = null) =>
        new(DateTimeOffset.UtcNow, level, exception, new MessageTemplateParser().Parse(message), []);

    [Fact]
    public void Log_line_is_one_ecs_json_object_with_the_service_name()
    {
        var json = Format(Event(LogEventLevel.Information, "data retention done"));

        Assert.Equal("data retention done", json.GetProperty("message").GetString());
        Assert.Equal("Information", json.GetProperty("log.level").GetString());
        Assert.True(json.TryGetProperty("@timestamp", out _));
        Assert.Equal("my-stb-api", json.GetProperty("service").GetProperty("name").GetString());
        Assert.Equal("dev", json.GetProperty("service").GetProperty("environment").GetString());
    }

    [Fact]
    public void Exception_goes_to_error_fields_and_stays_on_one_line()
    {
        var json = Format(Event(LogEventLevel.Error, "failed", new InvalidOperationException("bad \"thing\"\nline2")));

        Assert.Equal("bad \"thing\"\nline2", json.GetProperty("error").GetProperty("message").GetString());
        Assert.Contains("InvalidOperationException", json.GetProperty("error").GetProperty("type").GetString());
    }

    [Fact]
    public void Trace_id_of_the_current_activity_is_on_the_log_line()
    {
        using var activity = new Activity("test").Start();

        var json = Format(Event(LogEventLevel.Information, "inside a request"));

        Assert.Equal(activity.TraceId.ToString(), json.GetProperty("trace.id").GetString());
        Assert.Equal(activity.SpanId.ToString(), json.GetProperty("span.id").GetString());
    }

    [Fact]
    public void Nothing_is_exported_when_the_endpoint_variable_is_absent()
    {
        Environment.SetEnvironmentVariable(Observability.EndpointVariable, null);
        var builder = WebApplication.CreateBuilder();

        builder.AddObservability("my-stb-api");

        Assert.DoesNotContain(builder.Services, d => d.ServiceType == typeof(TracerProvider));
    }

    [Fact]
    public void Tracing_is_registered_when_the_endpoint_variable_is_set()
    {
        Environment.SetEnvironmentVariable(Observability.EndpointVariable, "http://127.0.0.1:59999");
        try
        {
            var builder = WebApplication.CreateBuilder();

            builder.AddObservability("my-stb-api");

            Assert.Contains(builder.Services, d => d.ServiceType == typeof(TracerProvider));
        }
        finally
        {
            Environment.SetEnvironmentVariable(Observability.EndpointVariable, null);
        }
    }

    [Theory]
    [InlineData("grpc", OtlpExportProtocol.Grpc)]
    [InlineData("GRPC", OtlpExportProtocol.Grpc)]
    [InlineData(" grpc ", OtlpExportProtocol.Grpc)]
    [InlineData(null, OtlpExportProtocol.HttpProtobuf)]
    [InlineData("", OtlpExportProtocol.HttpProtobuf)]
    [InlineData("http/protobuf", OtlpExportProtocol.HttpProtobuf)]
    [InlineData("something-else", OtlpExportProtocol.HttpProtobuf)]
    public void Protocol_is_grpc_only_when_asked(string? value, OtlpExportProtocol expected) =>
        Assert.Equal(expected, Observability.ParseProtocol(value));
}
